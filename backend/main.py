import os
import uuid
import asyncio
from typing import Optional

import httpx
from fastapi import FastAPI, Query, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from scraper import search_novels, get_novel_info, fetch_all_chapters, fetch_chapter_content, _get_client
from epub_builder import build_epub
import cache

app = FastAPI(title="NovelGrab API", version="2.0.0")

# CORS – allow all origins in dev; restrict in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory job store
jobs: dict = {}

TEMP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp")
os.makedirs(TEMP_DIR, exist_ok=True)


# --- Request/Response Models ---

class ChapterInput(BaseModel):
    title: str
    url: str


class GenerateRequest(BaseModel):
    novel_title: str
    author: str
    cover_url: str
    chapters: list[ChapterInput]


# --- API Endpoints ---

@app.get("/api/search")
async def api_search(q: str = Query(..., min_length=1)):
    """Search for novels on novelbin.com."""
    try:
        # Check cache first
        cached = cache.get_search(q)
        if cached is not None:
            return {"results": cached, "total": len(cached), "cached": True}
        results = await search_novels(q)
        cache.set_search(q, results)
        return {"results": results, "total": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@app.get("/api/chapters")
async def api_chapters(url: str = Query(...)):
    """Get novel info and full chapter list."""
    try:
        cached = cache.get_novel_info_cache(url)
        if cached is not None:
            return {**cached, "cached": True}
        info = await get_novel_info(url)
        cache.set_novel_info_cache(url, info)
        return info
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch chapters: {str(e)}")


@app.get("/api/chapter-content")
async def api_chapter_content(url: str = Query(...)):
    """Fetch a single chapter's HTML content for the in-app reader."""
    try:
        cached = cache.get_chapter(url)
        if cached is not None:
            return {"content": cached, "cached": True}
        client = await _get_client()
        content = await fetch_chapter_content(client, url)
        cache.set_chapter(url, content)
        return {"content": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch chapter: {str(e)}")


@app.post("/api/generate")
async def api_generate(req: GenerateRequest, background_tasks: BackgroundTasks):
    """Start an EPUB generation job."""
    job_id = str(uuid.uuid4())[:8]

    jobs[job_id] = {
        "status": "pending",
        "completed": 0,
        "total": len(req.chapters),
        "current_chapter_title": "",
        "download_url": "",
        "filepath": "",
        "error": "",
        "novel_title": req.novel_title,
    }

    # Start background generation
    background_tasks.add_task(
        _generate_epub_job,
        job_id,
        req.novel_title,
        req.author,
        req.cover_url,
        [{"title": ch.title, "url": ch.url} for ch in req.chapters],
    )

    return {"job_id": job_id}


@app.get("/api/progress/{job_id}")
async def api_progress(job_id: str):
    """SSE endpoint for real-time progress updates."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    async def event_generator():
        import json

        while True:
            job = jobs.get(job_id)
            if not job:
                yield {
                    "event": "error",
                    "data": json.dumps({"status": "error", "error": "Job not found"}),
                }
                break

            event_data = {
                "status": job["status"],
                "completed": job["completed"],
                "total": job["total"],
                "current_chapter_title": job["current_chapter_title"],
            }

            if job["status"] == "complete":
                event_data["download_url"] = f"/api/download/{job_id}"
                yield {
                    "event": "message",
                    "data": json.dumps(event_data),
                }
                break
            elif job["status"] == "error":
                event_data["error"] = job.get("error", "Unknown error")
                yield {
                    "event": "message",
                    "data": json.dumps(event_data),
                }
                break
            else:
                yield {
                    "event": "message",
                    "data": json.dumps(event_data),
                }

            await asyncio.sleep(0.5)

    return EventSourceResponse(event_generator())


@app.get("/api/download/{job_id}")
async def api_download(job_id: str):
    """Download the generated EPUB file."""
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job["status"] != "complete":
        raise HTTPException(status_code=400, detail="EPUB not ready yet")

    filepath = job.get("filepath", "")
    if not filepath or not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="EPUB file not found")

    filename = os.path.basename(filepath)
    # Use a friendlier filename for download
    from utils import sanitize_filename
    download_name = sanitize_filename(job.get("novel_title", "novel")) + ".epub"

    async def file_stream():
        with open(filepath, "rb") as f:
            while chunk := f.read(8192):
                yield chunk
        # Clean up after streaming
        try:
            os.remove(filepath)
            if job_id in jobs:
                del jobs[job_id]
        except Exception:
            pass

    return StreamingResponse(
        file_stream(),
        media_type="application/epub+zip",
        headers={
            "Content-Disposition": f'attachment; filename="{download_name}"',
        },
    )


# --- Background Job ---

async def _generate_epub_job(
    job_id: str,
    novel_title: str,
    author: str,
    cover_url: str,
    chapters: list,
):
    """Background task to fetch chapters and build EPUB."""
    try:
        jobs[job_id]["status"] = "fetching"
        total = len(chapters)

        async def progress_callback(idx: int, chapter_title: str):
            jobs[job_id]["completed"] = idx + 1
            jobs[job_id]["current_chapter_title"] = chapter_title

        # Fetch all chapter contents
        chapters_content = await fetch_all_chapters(chapters, progress_callback)

        # Build EPUB
        jobs[job_id]["status"] = "building"
        jobs[job_id]["current_chapter_title"] = "Compiling EPUB..."

        filepath = await build_epub(
            title=novel_title,
            author=author,
            cover_url=cover_url,
            chapters_content=chapters_content,
            job_id=job_id,
        )

        jobs[job_id]["status"] = "complete"
        jobs[job_id]["completed"] = total
        jobs[job_id]["current_chapter_title"] = "Done!"
        jobs[job_id]["filepath"] = filepath
        jobs[job_id]["download_url"] = f"/api/download/{job_id}"

    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)
        print(f"Job {job_id} failed: {e}")


@app.get("/api/dictionary/{word}")
async def api_dictionary(word: str):
    """Proxy endpoint for dictionary lookups (avoids CORS issues on some devices)."""
    try:
        cached = cache.get_dictionary(word)
        if cached is not None:
            return {**cached, "cached": True}

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}"
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=404, detail="Word not found")
            data = resp.json()
            entry = data[0] if data else {}
            result = {
                "word": entry.get("word", word),
                "phonetic": entry.get("phonetic", ""),
                "meanings": [
                    {
                        "partOfSpeech": m.get("partOfSpeech", ""),
                        "definitions": [
                            {
                                "definition": d.get("definition", ""),
                                "example": d.get("example"),
                            }
                            for d in m.get("definitions", [])[:3]
                        ],
                    }
                    for m in entry.get("meanings", [])
                ],
            }
            cache.set_dictionary(word, result)
            return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dictionary lookup failed: {str(e)}")


@app.get("/api/cache-stats")
async def api_cache_stats():
    """Return cache statistics."""
    return cache.cache_stats()


@app.delete("/api/cache")
async def api_clear_cache():
    """Clear all cached data."""
    count = cache.clear_all()
    return {"cleared": count}


@app.get("/")
async def root():
    return {"message": "NovelGrab API is running", "version": "2.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
