import asyncio

from app.services.moss_service import MossService


async def main() -> None:
    document_count = await MossService().build_index()
    print(f"Indexed {document_count} documents into 'sales-coach'.")


if __name__ == "__main__":
    asyncio.run(main())