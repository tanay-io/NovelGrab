import asyncio
from scraper import search_novels

async def main():
    results = await search_novels("Shadow Slave")
    print(f"Found {len(results)} results")
    for r in results[:5]:
        print(f"  - {r['title']}")

asyncio.run(main())
