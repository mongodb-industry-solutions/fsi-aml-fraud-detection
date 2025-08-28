# ThreatSight 360 - Financial Fraud Detection System

![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Next JS](https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white)
![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![AWS](https://img.shields.io/badge/AWS-%23FF9900.svg?style=for-the-badge&logo=amazon-aws&logoColor=white)

**Comprehensive Financial Services Platform with Dual-Backend Microservices Architecture**

In today's rapidly evolving financial landscape, detecting fraudulent transactions quickly and accurately while maintaining robust AML/KYC compliance is crucial. Financial institutions of all sizes struggle with balancing customer experience with comprehensive fraud protection and regulatory compliance.

ThreatSight 360 addresses these challenges with real-time risk assessment, AI-powered pattern recognition, intelligent entity resolution, and comprehensive compliance operations.

By the end of this guide, you'll have a comprehensive fraud detection and AML/KYC compliance system up and running capable of:

- **Real-time Fraud Detection**: Multi-factor risk assessment with AI-powered pattern recognition
- **Intelligent Entity Resolution**: AI-powered fuzzy matching and duplicate detection for AML/KYC compliance
- **LLM-Powered Classification**: AWS Bedrock Claude-3 Sonnet for automated entity risk assessment
- **Azure AI Foundry Agent Integration**: Orchestrated multi-agent system with connected agents for historical context analysis
- **Automated Case Investigation**: AI-generated investigation reports and case documentation
- **Network Analysis**: Relationship mapping and graph analytics for compliance investigations
- **Vector-based Pattern Recognition**: Advanced similarity matching using MongoDB Atlas Vector Search
- **Dynamic Risk Model Management**: Configurable risk models with real-time updates

We will walk you through the process of configuring and using [MongoDB Atlas](https://www.mongodb.com/atlas/database) as your backend with [AWS Bedrock](https://aws.amazon.com/bedrock/) and [Azure AI Foundry](https://azure.microsoft.com/en-us/products/ai-foundry) for AI-powered risk assessment, multi-agent orchestration, and entity resolution in your [Next.js](https://nextjs.org/) and [FastAPI](https://fastapi.tiangolo.com/) application.

## Architecture Overview

ThreatSight 360 uses a **dual-backend microservices architecture**:

### **Backend** (`/backend`, port 8000)

- **Risk Model Management**: Multi-factor risk evaluation with risk models configurable in real-time with [MongoDB Atlas Change Streams](https://www.mongodb.com/docs/manual/changeStreams/).
- **Transaction Screening**: Real-time transaction screening using [MongoDB Atlas Vector Search](https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-overview/)

### **AML Backend** (`/aml-backend`, port 8001)

- **Entity Management**: Comprehensive individual and organization entity management with Customer 360 view possible due to the [MongoDB Document Model](https://www.mongodb.com/docs/manual/core/data-modeling-introduction/)
- **Intelligent Entity Resolution**: [MongoDB Atlas Search](https://www.mongodb.com/docs/atlas/atlas-search/) fuzzy matching and duplicate detection
- **LLM Classification Service**: AWS Bedrock Claude-3 Sonnet for entity risk assessment
- **Investigation Service**: Automated case investigation and report generation
- **Network Analysis**: Relationship and transaction graph traversal analytics using [MongoDB $graphLookup](https://www.mongodb.com/docs/manual/reference/operator/aggregation/graphLookup/)
- **Atlas Search Integration**: Advanced search capabilities with [faceted filtering](https://www.mongodb.com/docs/atlas/atlas-search/facet/) and [autocomplete](https://www.mongodb.com/docs/atlas/atlas-search/autocomplete/)

### **Frontend** (`/frontend`, port 3000)

- **Transaction Simulator**: Interactive fraud scenario testing
- **Risk Model Management**: Dynamic risk model configuration interface and [MongoDB Change Streams](https://www.mongodb.com/docs/manual/changeStreams/) for live risk model synchronization
- **Entity Management Dashboard**: Advanced entity 360 with relationship and transaction network visualization
- **Intelligent Entity Resolution Workflow**: A multi-step entity onboarding workflow involving MongoDB full-text + vector + [hybrid search with $rankFusion](https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/#atlas-vector-search-rankfusion), network traversal using [$graphLookup](https://www.mongodb.com/docs/manual/reference/operator/aggregation/graphLookup/) and risk classification and case generation using LLMs

![ThreatSight360 Fraud Detection App Architecture](frontend/public/sol_arch.png)

If you want to learn more about Financial Fraud Detection, AML/KYC Compliance, and AI-powered Risk Assessment, visit the following pages:

- [MongoDB for Financial Services](https://www.mongodb.com/industries/financial-services)
- [AWS Bedrock Foundation Models](https://aws.amazon.com/bedrock/foundation-models/)
- [Vector Search for Fraud Detection](https://www.mongodb.com/use-cases/fraud-detection)
- [Building Real-time Fraud Detection Systems](https://www.mongodb.com/developer/products/atlas/vector-search-fraud-detection/)
- [MongoDB Atlas Search Documentation](https://www.mongodb.com/docs/atlas/atlas-search/)

Let's get started!

## Azure AI Foundry Agent System

ThreatSight 360 leverages **Azure AI Foundry's multi-agent orchestration** to provide sophisticated fraud analysis with connected specialized agents:

### Main Fraud Detection Agent
- **Agent ID**: `asst_Q6FO8w2G1h81QnSI5giqHX9M`
- **Purpose**: Primary fraud detection orchestrator with 4 specialized functions:
  - `analyze_transaction_patterns`: Analyzes customer transaction history and velocity patterns
  - `check_sanctions_lists`: Validates entities against sanctions and watchlists  
  - `calculate_network_risk`: Performs graph-based network risk assessment
  - `search_similar_transactions`: Vector-based similarity matching against historical fraud patterns

### Connected File Doc Agent
- **Agent ID**: `asst_fQA3rCdyVoarTaifTSrlehuZ`  
- **Purpose**: Historical context analysis from past suspicious activity reports
- **Integration**: Connected agent that the main fraud agent calls for additional context when analyzing high-risk transactions

### Agent Orchestration Flow
1. **Stage 1**: Rules-based analysis determines if deeper investigation is needed
2. **Stage 2**: If required, Azure AI agent performs comprehensive analysis using:
   - All 4 fraud detection functions for current transaction analysis
   - Connected file doc agent for historical suspicious activity context
   - Multi-agent coordination for comprehensive risk assessment

The system automatically handles agent-to-agent communication, function calling, and response aggregation through Azure AI Foundry's native orchestration capabilities.

## Prerequisites

Before you begin working with this project, ensure that you have the following prerequisites set up in your development environment:

- **Python 3.10+**: Both backend services are built with Python. You can download it from the [official website](https://www.python.org/downloads/).

- **Node.js 18+**: The frontend requires Node.js 18 or higher, which includes npm for package management. You can download it from the [official Node.js website](https://nodejs.org/).

- **Poetry**: Both backend services use Poetry for dependency management. Install it by following the instructions on the [Poetry website](https://python-poetry.org/docs/#installation).

- **MongoDB Atlas Account**: This project uses MongoDB Atlas for data storage, Atlas Search, and vector search capabilities. If you don't have an account, you can sign up for free at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register). Once you have an account, follow these steps to set up a minimum free tier cluster:

  - Log in to your MongoDB Atlas account.
  - Create a new project or use an existing one, and then click "create a new database".
  - Choose the free tier option (M0).
  - Configure the cluster settings according to your preferences and then click "finish and close" on the bottom right.
  - Finally, add your IP to the network access list so you can access your cluster remotely.

- **AWS Account with Bedrock Access**: You'll need an AWS account with access to the Bedrock service for AI foundation models used in both fraud detection and entity resolution. Visit the [AWS Console](https://aws.amazon.com/console/) to set up an account and request access to Bedrock.

- **Docker (Optional)**: For containerized deployment, Docker is required. Install it from the [Docker website](https://www.docker.com/get-started).

## Quick Start

The fastest way to get ThreatSight 360 up and running:

```bash
# Clone the repository
git clone <repository-url>
cd fsi-aml-fraud-detection

# Install Poetry (if not already installed)
curl -sSL https://install.python-poetry.org | python3 -

# Setup all components
# Backend (Fraud Detection)
cd backend && poetry install && cd ..

# AML Backend
cd aml-backend && poetry install && cd ..

# Frontend
cd frontend && npm install && cd ..

# Start all services in development mode (in separate terminals)
# Terminal 1: Fraud Detection Backend
cd backend
poetry run uvicorn main:app --reload --port 8000

# Terminal 2: AML/KYC Backend
cd aml-backend
poetry run uvicorn main:app --reload --port 8001

# Terminal 3: Frontend
cd frontend
npm run dev
```

This will start:

- **Fraud Detection Backend** at [http://localhost:8000](http://localhost:8000)
- **AML/KYC Backend** at [http://localhost:8001](http://localhost:8001)
- **Frontend Application** at [http://localhost:3000](http://localhost:3000)

For detailed configuration, continue with the sections below.

## Initial Configuration

### Obtain your MongoDB Connection String

Once the MongoDB Atlas Cluster is set up, locate your newly created cluster, click the "Connect" button and select the "Connect your application" section. Copy the provided connection string. It should resemble something like this:

```
mongodb+srv://<username>:<password>@cluster-name.xxxxx.mongodb.net/
```

> [!Note]
> You will need the connection string to set up your environment variables later (`MONGODB_URI`).

### Set up AWS Bedrock Access

1. Log in to your AWS Management Console.

2. Navigate to the Bedrock service or search for "Bedrock" in the AWS search bar.

3. Follow the prompts to request access to the Bedrock service if you haven't already.

4. Once access is granted, create an IAM user with programmatic access and appropriate permissions for Bedrock.

5. Save the AWS Access Key ID and Secret Access Key for later use in your environment variables.

> [!Important]
> Keep your AWS credentials secure and never commit them to version control.

### Cloning the Github Repository

Now it's time to clone the ThreatSight 360 source code from GitHub to your local machine:

1. Open your terminal or command prompt.

2. Navigate to your preferred directory where you want to store the project using the `cd` command. For example:

   ```bash
   cd /path/to/your/desired/directory
   ```

3. Once you're in the desired directory, use the `git clone` command to clone the repository:

   ```bash
   git clone <repository-url>
   ```

4. After running the `git clone` command, a new directory with the repository's name will be created in your chosen directory. To navigate into the cloned repository, use the `cd` command:

   ```bash
   cd fsi-aml-fraud-detection
   ```

## MongoDB Atlas Configuration

### Set up Vector Search

ThreatSight 360 leverages MongoDB Atlas Vector Search for advanced fraud pattern recognition and entity similarity matching. Follow these steps to enable it:

#### 1. Fraud Pattern Vector Index

1. Navigate to your MongoDB Atlas dashboard and select your cluster.

2. Click on the "Search" tab located in the top navigation menu.

3. Click "Create Search Index".

4. Choose the JSON editor and click "Next".

5. Name your index "transaction_vector_index".

6. Select your database and the "transactions" collection.

7. For the index definition, paste the following JSON:

   ```json
   {
     "mappings": {
       "dynamic": true,
       "fields": {
         "vector_embedding": {
           "type": "knnVector",
           "dimensions": 1536,
           "similarity": "cosine"
         }
       }
     }
   }
   ```

#### 2. Entity Resolution Search Index

1. Create another Atlas Search index named "entity_resolution_search".

2. Select the "entities" collection.

3. Use the following comprehensive index definition for entity resolution:

   ```json
   {
     "mappings": {
       "dynamic": false,
       "fields": {
         "name": {
           "type": "document",
           "fields": {
             "full": [
               {
                 "type": "string",
                 "analyzer": "lucene.standard"
               },
               {
                 "type": "autocomplete",
                 "tokenization": "edgeGram",
                 "minGrams": 2,
                 "maxGrams": 15,
                 "foldDiacritics": true
               }
             ],
             "aliases": {
               "type": "string",
               "analyzer": "lucene.standard"
             }
           }
         },
         "entityType": {
           "type": "stringFacet"
         },
         "nationality": {
           "type": "stringFacet"
         },
         "residency": {
           "type": "stringFacet"
         },
         "jurisdictionOfIncorporation": {
           "type": "stringFacet"
         },
         "riskAssessment": {
           "type": "document",
           "fields": {
             "overall": {
               "type": "document",
               "fields": {
                 "level": {
                   "type": "stringFacet"
                 },
                 "score": {
                   "type": "numberFacet",
                   "boundaries": [0.0, 15.0, 25.0, 50.0, 100.0]
                 }
               }
             }
           }
         },
         "customerInfo": {
           "type": "document",
           "fields": {
             "businessType": {
               "type": "stringFacet"
             }
           }
         },
         "addresses": {
           "type": "document",
           "fields": {
             "structured": {
               "type": "document",
               "fields": {
                 "country": {
                   "type": "string",
                   "analyzer": "lucene.keyword"
                 },
                 "city": {
                   "type": "string",
                   "analyzer": "lucene.keyword"
                 }
               }
             },
             "full": {
               "type": "string",
               "analyzer": "lucene.standard"
             }
           }
         },
         "identifiers": {
           "type": "document",
           "fields": {
             "type": {
               "type": "string",
               "analyzer": "lucene.keyword"
             },
             "value": {
               "type": "string",
               "analyzer": "lucene.standard"
             }
           }
         },
         "scenarioKey": {
           "type": "string",
           "analyzer": "lucene.keyword"
         }
       }
     }
   }
   ```

#### 3. Entity Text Search Index

For enhanced entity text matching, create an Atlas Search index named "entity_text_search_index":

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "name": {
        "type": "document",
        "fields": {
          "full": { "type": "string" },
          "aliases": { "type": "string" }
        }
      },
      "addresses": {
        "type": "document",
        "fields": {
          "full": { "type": "string" }
        }
      },
      "entityType": { "type": "string" },
      "identifiers": {
        "type": "document",
        "fields": {
          "value": { "type": "string" }
        }
      }
    }
  }
}
```

#### 4. Entity Vector Search Index (Optional)

For semantic entity matching, create a vector search index named "entity_vector_search_index":

```json
{
  "type": "vectorSearch",
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    }
  ]
}
```

> [!Note]
> The index names must match exactly for the application to work properly.

### Set up Change Streams

For real-time updates in your application, you'll need to enable change streams in MongoDB Atlas:

1. Navigate to your MongoDB Atlas dashboard and select your cluster.

2. Go to "Database Access" in the left sidebar.

3. Ensure that your database user has the "readWrite" and "dbAdmin" roles for the database you'll be using.

4. For production environments, consider creating a dedicated user with specific privileges for change streams.

> [!Important]
> Change streams require a replica set, which is automatically provided by MongoDB Atlas, even in the free tier.

## Backend Configuration

### Main Backend (Fraud Detection) Setup

Navigate to the `backend` directory and create environment configuration:

```bash
cd backend
```

Create a `.env` file with the following configuration settings:

```bash
# MongoDB Connection
MONGODB_URI=mongodb+srv://<username>:<password>@cluster-name.xxxxx.mongodb.net/
DB_NAME=fsi-threatsight360

# AWS Bedrock Credentials
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_REGION=us-east-1

# Server Configuration
HOST=0.0.0.0
PORT=8000

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# Risk Assessment Thresholds
AMOUNT_THRESHOLD_MULTIPLIER=2.5
MAX_LOCATION_DISTANCE_KM=100
VELOCITY_TIME_WINDOW_MINUTES=10
VELOCITY_THRESHOLD=5
SIMILARITY_THRESHOLD=0.8

# Risk Weights
WEIGHT_AMOUNT=0.25
WEIGHT_LOCATION=0.25
WEIGHT_DEVICE=0.20
WEIGHT_VELOCITY=0.15
WEIGHT_PATTERN=0.15
```

Install dependencies and start the server:

```bash
# Install dependencies
cd backend
poetry install

# Start development server
poetry run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

> [!Note]
> For detailed backend configuration and API documentation, see [backend/README.md](backend/README.md)

### AML Backend (Entity Resolution & Compliance) Setup

Navigate to the `aml-backend` directory and create environment configuration:

```bash
cd aml-backend
```

Create a `.env` file with the following configuration settings:

```bash
# MongoDB Connection
MONGODB_URI=mongodb+srv://<username>:<password>@cluster-name.xxxxx.mongodb.net/
DB_NAME=fsi-threatsight360

# AWS Bedrock Credentials (for AI features)
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_REGION=us-east-1

# Server Configuration
HOST=0.0.0.0
PORT=8001

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# Atlas Search Configuration
ATLAS_SEARCH_INDEX=entity_resolution_search
ATLAS_TEXT_SEARCH_INDEX=entity_text_search_index
ENTITY_VECTOR_INDEX=entity_vector_search_index

# Performance Tuning
ATLAS_SEARCH_TIMEOUT=30000
MAX_SEARCH_RESULTS=1000
VECTOR_SEARCH_LIMIT=100
CONNECTION_POOL_SIZE=50
```

Install dependencies and start the server:

```bash
# Install dependencies
cd aml-backend
poetry install

# Start development server
poetry run uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

> [!Note]
> For detailed AML backend configuration and API documentation, see [aml-backend/README.md](aml-backend/README.md)

> [!Note]
> Never commit your `.env` files to version control. Make sure they're included in your `.gitignore` file.

## Frontend Configuration

### Set up Environment Variables

Navigate to the `frontend` directory of your project:

```bash
cd frontend
```

Create a `.env.local` file with the following content:

```bash
# API URLs for dual-backend architecture
NEXT_PUBLIC_FRAUD_API_URL=http://localhost:8000
NEXT_PUBLIC_AML_API_URL=http://localhost:8001

# Legacy compatibility (points to fraud backend)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> [!Note]
> The `.env.local` file will be ignored by Git automatically.

### Install Dependencies and Start

Install the frontend dependencies and start the development server:

```bash
# Install dependencies
cd frontend
npm install

# Start development server
npm run dev
```

Your frontend application should now be running at [http://localhost:3000](http://localhost:3000).

## Data Seeding

To populate your database with initial data for testing, we provide Jupyter notebooks with comprehensive synthetic data generation:

### Transaction Data (Fraud Detection Backend)

Use the [Transaction Synthetic Data Generation notebook](docs/ThreatSight360%20-%20Transaction%20Synthetic%20Data%20Generation.ipynb) to create:
- Customer profiles with varied transaction histories
- Realistic transaction patterns (normal and fraudulent)
- Sample fraud patterns for testing
- Risk models with different configurations

```bash
# Option 1: Use the provided notebook
jupyter notebook "docs/ThreatSight360 - Transaction Synthetic Data Generation.ipynb"

# Option 2: Run the backend seeding script
cd backend
poetry run python scripts/seed_data.py
```

### Entity Data (AML Backend)

Use the [Entity Resolution Synthetic Data Generation notebook](docs/ThreatSight%20360%20-%20Entity%20Resolution%20Synthetic%20Data%20Generation.ipynb) to create:
- Individual and organization entities
- Entity relationships for network analysis
- Risk assessment data
- Sample watchlist matches

```bash
# Use the provided notebook
jupyter notebook "docs/ThreatSight 360 - Entity Resolution Synthetic Data Generation.ipynb"
```

## Using the Application

### Transaction Simulator

The Transaction Simulator allows you to test and visualize how the fraud detection system responds to different scenarios:

1. Navigate to [http://localhost:3000/transaction-simulator](http://localhost:3000/transaction-simulator).

2. Select a customer from the dropdown menu.

3. Choose a predefined fraud scenario or configure your own:

   - Normal Transaction
   - Unusual Amount
   - Unusual Location
   - New Device
   - Multiple Red Flags

4. Customize transaction details if needed:

   - Transaction type (purchase, withdrawal, transfer, deposit)
   - Payment method
   - Amount
   - Merchant category
   - Location information
   - Device information

5. Click "Evaluate Transaction" to analyze the risk profile.

6. Review the comprehensive risk assessment, including:
   - **Traditional Risk Assessment**: Rules-based evaluation with fraud pattern detection
   - **Advanced Vector Search**: AI-powered similarity matching against historical transactions
   - **Intelligent Vector Search Analysis**: Context-aware risk score calculation featuring:
     - **High-Risk Focus**: Detailed mathematical breakdowns only shown for concerning patterns
     - **Smart Transparency**: Step-by-step calculations when high-risk matches are detected
     - **Clean Interface**: Simplified display for normal/low-risk transactions
     - **Algorithm Explanations**: Educational content for fraud analysts when needed
   - **Context-aware Filtering**: Smart prioritization of relevant similar transactions
   - **Multi-factor Risk Scoring**: Comprehensive risk evaluation with detailed explanations

> [!Note]
> The simulator is a powerful tool for understanding how the system works and for demonstrating the capabilities to stakeholders.

### Entity Management Dashboard

The Entity Management interface provides comprehensive AML/KYC capabilities:

1. Navigate to [http://localhost:3000/entities](http://localhost:3000/entities).

2. Key capabilities include:

   - **Advanced Search**: Multi-strategy search with Atlas Search, autocomplete, and faceted filtering
   - **Entity Resolution**: AI-powered fuzzy matching and duplicate detection with vector search during onboarding
   - **Network Visualization**: Interactive relationship graphs using Cytoscape.js

3. Search and filter entities using:

   - Name-based fuzzy search with autocomplete
   - Entity type filters (Individual, Organization)
   - Risk level filters (Low, Medium, High, Critical)
   - Geographic filters (Country, City, Nationality, Residency)
   - Business type and jurisdiction filters

4. Click on any entity to view:
   - Detailed entity information and identifiers
   - Risk assessment details and watchlist matches
   - Relationship + transaction network visualization
   - Similar entities and potential duplicates

### Enhanced Entity Resolution Workflow

The Enhanced Entity Resolution feature provides a comprehensive 5-step workflow for intelligent entity onboarding, duplicate detection, and risk assessment:

1. Navigate to [http://localhost:3000/entity-resolution/enhanced](http://localhost:3000/entity-resolution/enhanced).

2. **Step 0 - Entity Input**: Enter new entity information using the simplified onboarding form:

   - Entity Type (Individual or Organization)
   - Full Name
   - Address

3. **Step 1 - Parallel Search**: The system performs AI-powered search using three methods simultaneously:

   - **Atlas Search**: Text-based fuzzy matching on names and addresses
   - **Vector Search**: Semantic similarity analysis using AWS Bedrock AI embeddings
   - **Hybrid Search**: MongoDB $rankFusion combining both approaches with contribution analysis

4. **Step 2 - Network Analysis**: Comprehensive network risk assessment for top 3 hybrid search matches:

   - **Relationship Networks**: Graph analysis with depth-2 traversal
   - **Transaction Networks**: Transaction pattern analysis with depth-1 traversal

5. **Step 3 - AI Classification**: LLM-powered entity classification using AWS Bedrock Claude-3 Sonnet:

   - **Comprehensive Analysis**: Evaluates entity data, search results, and network analysis
   - **Risk Assessment**: Generates risk scores, confidence levels, and recommended actions
   - **AML/KYC Compliance**: Identifies compliance flags and concerns
   - **Network Positioning**: Analyzes entity's position within relationship networks

6. **Step 4 - Case Investigation**: Automated case document creation for compliance workflows:
   - **Case Document Generation**: Creates MongoDB case document
   - **LLM Investigation Summary**: Professional investigation narrative using AI
   - **Workflow Consolidation**: Combines all previous steps into comprehensive case file
   - **Report Generation**: Export PDF report Case Report

### Risk Model Management

The Risk Model Management interface allows administrators to configure and deploy different risk assessment models:

1. Navigate to [http://localhost:3000/risk-models](http://localhost:3000/risk-models).

2. View and select from available risk models in the system.

3. Key capabilities include:

   - **Dynamic Risk Factor Management**: Add or modify risk factors without system changes
   - **Real-Time Updates**: See changes instantly using MongoDB Change Streams
   - **Version Control**: Create and manage multiple versions of risk models
   - **Model Activation**: Easily switch between different models
   - **Performance Metrics**: Track effectiveness with false positive/negative rates
   - **Custom Thresholds**: Configure flag and block thresholds for each model
   - **Model Reset Functionality**: Reset models to clean state by removing version 2 models and setting default configurations

4. To create a new risk model:

   - Click "Create New Model"
   - Configure basic information (name, description)
   - Add risk factors with appropriate weights and thresholds
   - Set overall model thresholds
   - Save and optionally activate the model

5. To reset models to default state:
   - Click "Reset Models" (located on the far right of the action buttons)
   - This will delete all version 2 models, set `default-risk-model` to active, and set `behavioral-risk-model` to inactive
   - Useful for returning to a clean baseline during testing or demos

> [!Important]
> All changes are reflected in real-time across all connected sessions thanks to MongoDB Change Streams.

## Docker Deployment

For containerized deployment in production environments:

1. Ensure Docker and Docker Compose are installed on your system.

2. Configure environment variables for production in your `.env` files.

3. Build and run the containers:

   ```bash
   # Build all images
   docker-compose build
   
   # Start all services
   docker-compose up -d
   
   # Or build and start in one command
   docker-compose up --build -d
   ```

4. This will run containers for:

   - Frontend (port 3000)
   - Fraud Detection Backend (port 8000)
   - AML/KYC Backend (port 8001)

5. Access the application at [http://localhost:3000](http://localhost:3000).

> [!Note]
> The Docker configuration uses production settings by default. Check the `docker-compose.yml` file and individual Dockerfiles for details.

## Additional Resources

Check additional and accompanying resources below:

### MongoDB Resources

- [MongoDB for Financial Services](https://www.mongodb.com/industries/financial-services)
- [MongoDB Atlas Search Documentation](https://www.mongodb.com/docs/atlas/atlas-search/)
- [MongoDB Atlas Vector Search](https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-overview/)
- [MongoDB Change Streams](https://www.mongodb.com/docs/manual/changeStreams/)
- [MongoDB $graphLookup](https://www.mongodb.com/docs/manual/reference/operator/aggregation/graphLookup/)
- [MongoDB $rankFusion](https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/#atlas-vector-search-rankfusion)
- [MongoDB LeafyGreen UI](https://www.mongodb.design/)

### Financial Services & Compliance

- [Building Real-time Fraud Detection Systems](https://www.mongodb.com/use-cases/fraud-detection)
- [Financial Services Solutions](https://www.mongodb.com/solutions/industries/financial-services)
- [Vector Search for Fraud Detection](https://www.mongodb.com/developer/products/atlas/vector-search-fraud-detection/)

## Architecture Details

For detailed information about the system architecture and implementation:

- **Fraud Detection Backend**: [backend/README.md](backend/README.md) - Real-time fraud detection and risk assessment
- **AML/KYC Backend**: [aml-backend/README.md](aml-backend/README.md) - Entity resolution and compliance operations
- **Architecture Documentation**: [docs/](docs/) - Detailed architecture diagrams and implementation guides

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
