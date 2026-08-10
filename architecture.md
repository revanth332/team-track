Project architecture:

 An elegant layered architecture showing how the React Client makes REST requests to FastAPI, which utilizes a fully asynchronous pipeline consisting of the Sheet Service, the Zoho Sheet Manager, and a concurrency-locked Token Manager, all sharing a persistent HTTP AsyncClient from the central Network Utility layer to communicate with Zoho APIs. 

 ```mermaid
graph TD
    subgraph ClientLayer [Client Layer]
        C[Web Browser / React Client]
    end

    subgraph APILayer [FastAPI Routers]
        M[main.py]
        S_R[app/api/v1/shifts.py]
    end

    subgraph ServiceLayer [Service Layer]
        S_S[app/services/sheet_service.py]
    end

    subgraph ZohoIntegration [Zoho Integration]
        Z_M[app/services/zoho_sheet_manager.py]
        T_M[app/core/token_manager.py]
    end

    subgraph NetworkUtilities [Central Network Layer]
        H_C[app/core/http_client.py]
    end

    subgraph ExternalAPIs [External Zoho APIs]
        Z_OAuth[Zoho OAuth Server]
        Z_Sheet[Zoho Sheet API v2]
    end

    C -->|HTTP REST Requests| M
    M -->|Routes to| S_R
    S_R -->|Calls| S_S
    S_S -->|Invokes Awaitable Methods| Z_M
    Z_M -->|Awaits Access Token| T_M
    Z_M -->|Acquires Shared Client| H_C
    T_M -->|Acquires Shared Client| H_C
    H_C -->|Async POST Request| Z_OAuth
    H_C -->|Async CRUD Requests| Z_Sheet
```
