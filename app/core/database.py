from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

class Database:
    client: AsyncIOMotorClient = None

db = Database()

# Serverless-safe database getter
def get_database():
    # If the client doesn't exist (cold start), create it
    if db.client is None:
        db.client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            maxPoolSize=10, # Keep pool size small for Serverless
            minPoolSize=0
        )
        print("Initialized new MongoDB connection")
        
    return db.client[settings.DATABASE_NAME]