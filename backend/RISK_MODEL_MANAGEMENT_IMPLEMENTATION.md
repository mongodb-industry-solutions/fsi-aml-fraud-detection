# MongoDB Risk Model Management Implementation

This document outlines how MongoDB is used to implement the Risk Model Management system in the ThreatSight360 Fraud Detection application, highlighting the advantages of MongoDB over SQL databases.

## Overview

The Risk Model Management system allows creating, updating, activating, and monitoring risk scoring models used for transaction risk evaluation. The implementation showcases key MongoDB advantages:

1. **Schema Flexibility**: Add custom risk factors without schema migrations
2. **Real-Time Updates**: Use Change Streams for instant notifications of model changes
3. **Document Model**: Natural data representation with embedded risk factors
4. **Versioning**: Complete model versions stored as separate documents

## Architecture

1. **Model Storage**: Risk models stored in the `risk_models` collection
2. **Model Evaluation**: Active model cached in memory and used for transaction evaluation
3. **Change Streams**: Real-time notification of model changes (activation, updates)
4. **Performance Tracking**: Model usage metrics stored in `model_performance` collection

## Backend Implementation

### Risk Model Service

The `RiskModelService` in `services/risk_model_service.py` maintains the active risk model and listens for changes:

```python
class RiskModelService:
    """Service for managing and applying risk models with real-time updates."""
    
    def __init__(self, db_client: MongoClient):
        """Initialize the risk model service with MongoDB client."""
        self.db = db_client.get_database("fraud_detection_demo")
        self.risk_models_collection = self.db.get_collection("risk_models")
        self.current_model: Dict[str, Any] = {}
        self.change_stream: Optional[ChangeStream] = None
        self.is_running = False
    
    async def start(self):
        """Start the risk model service and listen for model updates."""
        if self.is_running:
            return
        
        # Load the active model
        await self.load_active_model()
        
        # Start listening for changes
        await self.start_change_stream()
        
        self.is_running = True
        logger.info("Risk model service started")
    
    async def start_change_stream(self):
        """Start listening for changes to the risk models collection."""
        pipeline = [
            {"$match": {"operationType": {"$in": ["insert", "update", "replace"]}}},
            {"$match": {"fullDocument.status": "active"}}
        ]
        
        # Set up change stream in a separate task
        async def watch_changes():
            async with self.db.risk_models.watch(pipeline) as stream:
                async for change in stream:
                    try:
                        new_model = change["fullDocument"]
                        self.current_model = new_model
                        logger.info(f"Risk model updated: {new_model['modelId']} (v{new_model['version']})")
                    except Exception as e:
                        logger.error(f"Error processing model change: {str(e)}")
        
        asyncio.create_task(watch_changes())
```

### Risk Model API Endpoints

The API endpoints in `routes/model_management.py` provide a comprehensive set of operations:

```python
# List all risk models
@router.get("/", response_model=List[RiskModelResponse])
async def get_risk_models(
    status: Optional[str] = Query(None, description="Filter by model status (active, archived, draft)"),
    db = Depends(get_database)
)

# Get a specific model
@router.get("/{model_id}", response_model=RiskModelResponse)
async def get_risk_model(
    model_id: str,
    version: Optional[int] = None,
    db = Depends(get_database)
)

# Create a new model
@router.post("/", response_model=RiskModelResponse)
async def create_risk_model(
    model: RiskModelCreate,
    db = Depends(get_database)
)

# Update a model
@router.put("/{model_id}", response_model=RiskModelResponse)
async def update_risk_model(
    model_id: str,
    update: RiskModelUpdate,
    db = Depends(get_database)
)

# Archive a model
@router.delete("/{model_id}")
async def archive_risk_model(
    model_id: str,
    version: Optional[int] = None,
    db = Depends(get_database)
)

# Activate a model
@router.post("/{model_id}/activate")
async def activate_risk_model(
    model_id: str,
    version: Optional[int] = None,
    db = Depends(get_database)
)

# Get model performance metrics
@router.get("/{model_id}/performance", response_model=Dict[str, Any])
async def get_model_performance(
    model_id: str,
    version: Optional[int] = None,
    timeframe: Optional[str] = Query("24h", description="Performance timeframe (24h, 7d, 30d)"),
    db = Depends(get_database)
)

# Record transaction outcome feedback
@router.post("/{model_id}/feedback")
async def provide_transaction_feedback(
    model_id: str,
    transaction_id: str,
    outcome: str = Body(..., description="Actual outcome: 'legitimate' or 'fraud'"),
    db = Depends(get_database)
)
```

### WebSocket Change Stream API

The WebSocket endpoint provides real-time updates using MongoDB Change Streams:

```python
@router.websocket("/change-stream")
async def websocket_endpoint(websocket: WebSocket, db = Depends(get_database)):
    """WebSocket endpoint for real-time model updates using MongoDB Change Streams."""
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        # Set up pipeline to watch for risk model changes
        pipeline = [
            {"$match": {"operationType": {"$in": ["insert", "update", "replace", "delete"]}}},
            {"$match": {"ns.coll": "risk_models"}}
        ]
        
        # Create a change stream on the risk_models collection
        async with db.watch(
            pipeline=pipeline,
            full_document_before_change=True,
            full_document='updateLookup'
        ) as change_stream:
            # Send initial models to establish baseline
            cursor = db.risk_models.find({})
            models = []
            async for document in cursor:
                if "_id" in document and isinstance(document["_id"], ObjectId):
                    document["_id"] = str(document["_id"])
                models.append(document)
            
            await websocket.send_json({
                "type": "initial",
                "models": models
            })
            
            # Process real-time changes
            async for change in change_stream:
                # Prepare the change data
                change_data = {
                    "type": "change",
                    "operationType": change["operationType"],
                }
                
                # Add relevant document data based on operation type
                if change["operationType"] in ["insert", "update", "replace"]:
                    doc = change["fullDocument"]
                    if "_id" in doc and isinstance(doc["_id"], ObjectId):
                        doc["_id"] = str(doc["_id"])
                    change_data["document"] = doc
                elif change["operationType"] == "delete":
                    doc_id = change["documentKey"]["_id"]
                    if isinstance(doc_id, ObjectId):
                        doc_id = str(doc_id)
                    change_data["documentId"] = doc_id
                
                # Send the change notification
                await websocket.send_json(change_data)
    
    except WebSocketDisconnect:
        active_connections.remove(websocket)
    except Exception as e:
        # Log the error but don't crash
        logger = logging.getLogger(__name__)
        logger.error(f"WebSocket error: {str(e)}")
        try:
            active_connections.remove(websocket)
        except ValueError:
            pass
```

## Frontend Implementation

The frontend React component in `components/ModelAdminPanel.js` connects to the WebSocket endpoint for real-time updates:

```javascript
// Connect to WebSocket for real-time MongoDB Change Streams
useEffect(() => {
  // Create WebSocket URL based on backend URL (replace http with ws)
  const wsUrl = BACKEND_URL.replace(/^http/, 'ws') + '/models/change-stream';
  const ws = new WebSocket(wsUrl);
  
  // Handle WebSocket events
  ws.onopen = () => {
    console.log('WebSocket connected to MongoDB Change Stream');
    setWsConnected(true);
    showToast('Connected to real-time model updates', 'success');
  };
  
  ws.onclose = () => {
    console.log('WebSocket disconnected');
    setWsConnected(false);
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    setWsConnected(false);
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    // Handle initial models data
    if (data.type === 'initial') {
      setModels(data.models);
      
      // Select first active model by default
      const activeModel = data.models.find((model) => model.status === 'active');
      if (activeModel && !selectedModelId) {
        setSelectedModelId(activeModel.modelId);
        setSelectedModel(activeModel);
      }
    }
    
    // Handle change events
    if (data.type === 'change') {
      // Add the event to our change event log
      setChangeEvents(prev => {
        // Keep only last 5 events
        const newEvents = [data, ...prev.slice(0, 4)];
        return newEvents;
      });
      
      // Update models list based on operation type
      if (data.operationType === 'insert' || data.operationType === 'update' || data.operationType === 'replace') {
        const updatedDoc = data.document;
        
        setModels(prevModels => {
          // Check if model already exists in our list
          const existingIndex = prevModels.findIndex(
            m => m.modelId === updatedDoc.modelId && m.version === updatedDoc.version
          );
          
          if (existingIndex >= 0) {
            // Update existing model
            const updatedModels = [...prevModels];
            updatedModels[existingIndex] = updatedDoc;
            return updatedModels;
          } else {
            // Add new model
            return [...prevModels, updatedDoc];
          }
        });
        
        // If this update affects our selected model, update it too
        if (selectedModel && selectedModel.modelId === updatedDoc.modelId && 
            selectedModel.version === updatedDoc.version) {
          setSelectedModel(updatedDoc);
          showToast(`Model ${updatedDoc.modelId} updated in real-time`, 'info');
        }
      }
    }
  };
  
  // Clean up on component unmount
  return () => {
    ws.close();
  };
}, [showToast, selectedModelId]);
```

## Data Model

The risk model document structure demonstrates the advantages of MongoDB's document model:

```javascript
{
  "_id": ObjectId("..."),
  "modelId": "risk-model-2024-q2",
  "version": 1,
  "status": "active",  // active, inactive, draft, archived
  "createdAt": ISODate("2024-03-14T12:34:56Z"),
  "updatedAt": ISODate("2024-03-14T12:34:56Z"),
  "description": "Q2 2024 risk scoring model with enhanced location detection",
  "thresholds": {
    "flag": 60,
    "block": 85
  },
  "weights": {
    "amount_anomaly_high": 30,
    "amount_anomaly_medium": 15,
    "location_anomaly": 25,
    "merchant_category_anomaly": 10,
    "unknown_device": 35,
    "velocity_anomaly": 20,
    "time_of_day_anomaly": 15
  },
  "riskFactors": [
    {
      "id": "amount_anomaly_high",
      "description": "Transaction amount significantly higher than customer average",
      "threshold": 3.0,
      "active": true
    },
    {
      "id": "amount_anomaly_medium",
      "description": "Transaction amount moderately higher than customer average",
      "threshold": 2.0,
      "active": true
    },
    {
      "id": "location_anomaly",
      "description": "Transaction from unusual location",
      "distanceThreshold": 100,  // km
      "active": true
    },
    {
      "id": "merchant_category_anomaly",
      "description": "Transaction in unusual merchant category", 
      "active": true
    },
    {
      "id": "unknown_device",
      "description": "Transaction from unknown device",
      "active": true
    },
    {
      "id": "velocity_anomaly",
      "description": "Multiple transactions in short timeframe",
      "threshold": 5,  // transactions per hour
      "active": true
    }
  ],
  "performance": {
    "falsePositiveRate": 3.2,
    "falseNegativeRate": 1.8,
    "avgProcessingTime": 42  // ms
  }
}
```

Performance tracking document structure:

```javascript
{
  "_id": ObjectId("..."),
  "modelId": "risk-model-2024-q2",
  "modelVersion": 1,
  "customerId": "cust123456",
  "transactionId": "trans789012",
  "riskScore": 75,
  "riskFactors": ["amount_anomaly_high", "location_anomaly"],
  "timestamp": ISODate("2024-03-14T12:34:56Z"),
  "outcome": "legitimate"  // legitimate or fraud, set via feedback
}
```

## MongoDB Advantages

### Schema Flexibility

**MongoDB Advantage**: Add new risk factors without schema migrations or downtime

In SQL databases, adding new risk factors would require:
1. Database schema migrations
2. Table alterations
3. Application downtime
4. Complex update scripts

With MongoDB:
1. Simply add the new risk factor to the `riskFactors` array
2. No schema changes or migrations required
3. No downtime needed
4. Different risk factors can have different properties (threshold, distanceThreshold, etc.)

### Real-Time Updates via Change Streams

**MongoDB Advantage**: Get instant notifications when models are updated using Change Streams

In SQL databases, real-time updates would require:
1. Polling the database periodically
2. Complex notification systems
3. Triggers and external message queues

With MongoDB:
1. Change Streams provide real-time notifications
2. Direct WebSocket connection to Change Streams
3. No polling required, reducing database load
4. Automatic cache invalidation when models change

### Document Model Benefits

**MongoDB Advantage**: Natural data representation with embedded documents

In SQL databases, this model would require:
1. Multiple tables (models, risk_factors, weights, thresholds)
2. Complex JOINs to reconstruct the full model
3. Transaction management across tables

With MongoDB:
1. Single document contains all model data
2. Risk factors embedded directly in the model
3. No JOINs required
4. Natural representation of the business object

### Versioning and History

**MongoDB Advantage**: Simple versioning with complete model copies

In SQL databases, versioning would require:
1. Complex version tables
2. Tracking changes across multiple related tables
3. Reconstructing historical versions

With MongoDB:
1. Each version is a complete standalone document
2. Simple queries to find specific versions
3. Easy rollback to previous versions
4. Complete history with creation and update timestamps

**Implementation Detail**: When retrieving models for updates, we use MongoDB's sort functionality to ensure we always get the latest version:

```python
# Find the model - get the latest version by sorting descending
model = await risk_models_collection.find_one(
    {"modelId": model_id, "status": {"$ne": "archived"}},
    sort=[("version", -1)]  # Sort by version in descending order to get the latest
)
```

This ensures that when creating a new version, we always increment from the most recent version number, rather than potentially creating duplicate versions.

## Demo Walkthrough

When demonstrating the Risk Model Management feature:

### 1. View and Select Models

1. Open the Risk Model panel
2. Observe the list of available models
3. Select a model to view its details
4. Note the real-time connection indicator (WebSocket + Change Stream)

### 2. Demonstrate Schema Flexibility

1. Enter edit mode for a model
2. Navigate to the "Schema Flexibility" card
3. Demonstrate adding a custom risk factor on-the-fly:
   - Add a new risk factor ID (e.g., "device_location_mismatch")
   - Add a description
   - Set a threshold
   - Click "Add Factor"
4. Point out that no schema changes or migrations were needed

### 3. Demonstrate Real-Time Updates

1. Open two browser windows side by side
2. Make changes to a model in one window
3. Observe the changes appearing instantly in the other window
4. Point out the Change Stream events log showing the real-time updates
5. Highlight that this is powered by MongoDB Change Streams, not polling

### 4. Document Model Advantages

1. Show how the entire model, including all risk factors, is accessible in a single request
2. Point out that different risk factors can have different properties (threshold vs. distanceThreshold)
3. Highlight the embedded data structure vs. what would be required in a relational model

### 5. Version Management

1. Update an active model
2. Observe how a new version is automatically created
3. Show how both versions exist as separate documents
4. Demonstrate activating a specific version
5. Point out that all other models are instantly deactivated

### 6. Performance Metrics

1. Navigate to the performance metrics view
2. Show the risk factor distribution
3. Demonstrate changing the timeframe (24h, 7d, 30d)
4. Point out how MongoDB aggregation makes these metrics easy to calculate

## Benefits Summary

1. **Development Speed**: Add new risk factors without schema changes
2. **Operational Efficiency**: No migrations or downtime required
3. **Real-Time Insights**: Instant notifications of model changes
4. **Natural Data Modeling**: Business objects represented intuitively
5. **Simplified Versioning**: Complete history with easy rollbacks
6. **Performance**: Efficient queries without complex JOINs
7. **Scalability**: Horizontal scaling for large model repositories

This implementation demonstrates how MongoDB's document model, schema flexibility, and Change Streams provide significant advantages over traditional SQL databases for a dynamic risk model management system.