Project architecture:

 Layered architecture diagram of TeamTrack highlighting the multi-lead automated bandwidth alert system, showing how Vercel Cron or Team Leads trigger FastAPI endpoints, which evaluate team capacity in MongoDB, encrypt/decrypt Zoho credentials, and dispatch reports via Zoho SMTP. 

 ```mermaid
graph TD
    subgraph ClientLayer [Client Layer]
        ReactClient[React Frontend - MyTeam UI]
        VercelCron[Vercel Cron Scheduler - 5PM IST]
    end

    subgraph APILayer [FastAPI Routers]
        BandwidthRouter[app/api/v1/bandwidth.py]
    end

    subgraph ServiceLayer [Service Layer]
        BandwidthService[app/services/bandwidth_email_service.py]
        UserService[app/services/user_service.py]
    end

    subgraph CoreLayer [Core Security & DB]
        EncryptionCore[app/core/encryption.py]
        MongoDB[(MongoDB Database)]
    end

    subgraph ExternalServices [External Email Gateway]
        ZohoSMTP[Zoho SMTP Server]
    end

    ReactClient -->|Configure / Test Settings| BandwidthRouter
    VercelCron -->|Daily Cron Request| BandwidthRouter
    BandwidthRouter -->|Process Request| BandwidthService
    BandwidthService -->|Fetch Team Members| UserService
    BandwidthService -->|Query Settings & Users| MongoDB
    BandwidthService -->|Encrypt / Decrypt Credentials| EncryptionCore
    BandwidthService -->|Send Email Reports via SSL| ZohoSMTP
```
