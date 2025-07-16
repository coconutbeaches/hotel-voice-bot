# Hotel Voice Bot System Architecture

## Architecture Diagram

```mermaid
graph TB
    %% External Services
    WA[WhatsApp Business Cloud API]
    OPENAI[OpenAI GPT-4 / LangChain LLM]
    PMS[Hotel PMS System]

    %% Main Services
    subgraph "Chatbot Service (Node.js/TypeScript)"
        direction TB
        WH[Webhook Handler]
        MSG[Message Processor]
        NLP[NLP Controller]
        PMS_INT[PMS Integration Controller]
        AUTH[Auth Middleware]
    end

    subgraph "Supabase Backend"
        direction TB
        DB[(Postgres Database)]
        SAUTH[Supabase Auth]
        EDGE[Edge Functions]

        subgraph "Database Tables"
            CONV[Conversations]
            USERS[Users/Agents]
            PROMPTS[Prompt Templates]
            LOGS[Audit Logs]
            BOOKINGS[Booking Data]
        end
    end

    subgraph "PMS Integration Microservice"
        direction TB
        REST[REST API Gateway]
        GQL[GraphQL Endpoint]
        ADAPTER[PMS Adapters]
    end

    subgraph "Observability Stack"
        direction TB
        PROM[Prometheus]
        GRAF[Grafana]
        SENTRY[Sentry]
    end

    %% Data Flow Connections
    WA -->|Webhook| WH
    WH --> MSG
    MSG --> NLP
    MSG --> PMS_INT

    NLP -->|API Request| OPENAI
    NLP -->|Store/Retrieve| PROMPTS

    PMS_INT -->|REST/GraphQL| REST
    PMS_INT -->|REST/GraphQL| GQL
    REST --> ADAPTER
    GQL --> ADAPTER
    ADAPTER -->|Integration| PMS

    MSG -->|Store Messages| CONV
    AUTH -->|Authenticate| SAUTH

    %% Logging and Monitoring
    WH -->|Metrics| PROM
    MSG -->|Metrics| PROM
    NLP -->|Metrics| PROM
    PMS_INT -->|Metrics| PROM

    WH -->|Errors| SENTRY
    MSG -->|Errors| SENTRY
    NLP -->|Errors| SENTRY
    PMS_INT -->|Errors| SENTRY

    PROM -->|Visualize| GRAF

    %% Security Boundaries
    classDef external fill:#ffcccc,stroke:#ff0000,stroke-width:2px
    classDef internal fill:#ccffcc,stroke:#00ff00,stroke-width:2px
    classDef database fill:#ccccff,stroke:#0000ff,stroke-width:2px
    classDef monitoring fill:#ffffcc,stroke:#ffaa00,stroke-width:2px

    class WA,OPENAI,PMS external
    class WH,MSG,NLP,PMS_INT,AUTH,REST,GQL,ADAPTER internal
    class DB,SAUTH,EDGE,CONV,USERS,PROMPTS,LOGS,BOOKINGS database
    class PROM,GRAF,SENTRY monitoring
```

## Component Details

### 1. WhatsApp Business Cloud API Integration

- **Webhook Handler**: Receives incoming messages from WhatsApp
- **Message Processor**: Processes and routes messages
- **Security**: Webhook verification and rate limiting

### 2. Chatbot Service (Node.js/TypeScript)

- **Framework**: NestJS for structured, scalable architecture
- **Features**:
  - Webhook handling for WhatsApp messages
  - Message processing and routing
  - NLP integration controller
  - PMS integration controller
  - Authentication middleware

### 3. Supabase Backend

- **Database**: PostgreSQL for persistent data storage
- **Authentication**: Supabase Auth for agent/operator login
- **Edge Functions**: For serverless processing if needed
- **Tables**:
  - Conversations: Chat history and context
  - Users/Agents: Authentication and authorization
  - Prompt Templates: NLP prompts and responses
  - Audit Logs: Security and compliance tracking
  - Booking Data: Hotel reservation information

### 4. NLP Layer

- **Primary**: OpenAI GPT-4 for advanced language understanding
- **Alternative**: Open-source LLM via LangChain
- **Prompt Management**: Templates stored in Supabase
- **Context**: Conversation history and hotel-specific knowledge

### 5. Hotel PMS Integration Microservice

- **REST API**: Standard HTTP endpoints
- **GraphQL**: For flexible data querying
- **Adapters**: Support multiple PMS systems
- **Features**: Booking management, room availability, guest services

### 6. Observability Stack

- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **Sentry**: Error tracking and performance monitoring

## Security Considerations

### PCI/PII Compliance

- **Data Encryption**: All sensitive data encrypted at rest and in transit
- **Access Control**: Role-based access via Supabase Auth
- **Audit Logging**: All operations logged for compliance
- **Token Security**: Secure token exchange between services

### Data Residency

- **Supabase**: Configure for specific geographic regions
- **OpenAI**: Review data processing agreements
- **Monitoring**: Track data flow across regions

## Scalability Design

### Horizontal Scaling

- **Stateless Services**: All services designed to be stateless
- **Load Balancing**: Multiple instances behind load balancer
- **Database Scaling**: Supabase handles automatic scaling
- **Caching**: Redis for frequently accessed data

### Performance Optimization

- **Database Indexing**: Optimized queries for conversations and bookings
- **Connection Pooling**: Efficient database connections
- **Async Processing**: Non-blocking operations
- **Rate Limiting**: Prevent abuse and ensure fair usage

## Deployment Architecture

```mermaid
graph TB
    subgraph "Production Environment"
        LB[Load Balancer]
        subgraph "Chatbot Service Cluster"
            CS1[Chatbot Service 1]
            CS2[Chatbot Service 2]
            CS3[Chatbot Service N]
        end

        subgraph "PMS Integration Cluster"
            PMS1[PMS Service 1]
            PMS2[PMS Service 2]
        end

        subgraph "Supabase Cloud"
            SB[(Supabase)]
        end

        subgraph "Monitoring"
            MON[Prometheus/Grafana]
            ERR[Sentry]
        end
    end

    LB --> CS1
    LB --> CS2
    LB --> CS3

    CS1 --> PMS1
    CS2 --> PMS2
    CS3 --> PMS1

    CS1 --> SB
    CS2 --> SB
    CS3 --> SB

    CS1 --> MON
    CS2 --> MON
    CS3 --> MON

    CS1 --> ERR
    CS2 --> ERR
    CS3 --> ERR
```
