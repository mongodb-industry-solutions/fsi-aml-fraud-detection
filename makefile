# ThreatSight 360 — fsi-aml-fraud-detection
#
# Three runnables in one repo:
#   backend/      fraud detection API   :8000
#   aml-backend/  AML/KYC + agents API  :8001
#   frontend/     Next.js UI            :8080
#
# Ports are overridable:  make dev FRONTEND_PORT=3000

FRAUD_PORT    ?= 8000
AML_PORT      ?= 8001
FRONTEND_PORT ?= 8080
DB           ?= leafy_bank_bian

.DEFAULT_GOAL := help

.PHONY: help build start stop clean setup install install-backend install-aml install-frontend \
        update dev dev-backend dev-frontend dev-fraud dev-aml dev-stop dev-stop-backend \
        dev-stop-frontend dev-logs dev-status dev-kill-all env-check db-check aml-check

help:
	@echo "ThreatSight 360 — make targets"
	@echo ""
	@echo "  setup             Install all deps (poetry x2 + npm)"
	@echo "  dev               Start all three services with auto-reload"
	@echo "  dev-backend       Start fraud + aml only"
	@echo "  dev-frontend      Start the Next.js UI only"
	@echo "  dev-fraud         Start the fraud API only          (:$(FRAUD_PORT))"
	@echo "  dev-aml           Start the AML API only            (:$(AML_PORT))"
	@echo "  dev-stop          Stop everything"
	@echo "  dev-status        Which services are up"
	@echo "  dev-logs          Tail all logs"
	@echo "  dev-kill-all      Kill anything on 300*/800*"
	@echo ""
	@echo "  env-check         Verify MONGODB_URI / DB_NAME / NEXT_PUBLIC_API_URL"
	@echo "  db-check          Verify the migrated data is reachable and scoped"
	@echo "  aml-check         Verify the 7 renamed AML collections + search indexes"
	@echo ""
	@echo "  build/start/stop/clean   docker-compose (see caveat in docker/ section)"

# ─── Docker ──────────────────────────────────────────────────────────────────────
# NOTE: docker/docker-compose.yml builds with context `.` (= docker/) but references
# Dockerfile.backend, which lives at the repo ROOT, not in docker/. It also has no
# aml-backend service. `make build` will fail until that is fixed — use `make dev`.

build:
	cd docker && docker-compose up --build -d

start:
	cd docker && docker-compose start

stop:
	cd docker && docker-compose stop

clean:
	cd docker && docker-compose down --rmi all -v

# ─── Install ─────────────────────────────────────────────────────────────────────

setup: install

install: install-backend install-aml install-frontend
	@echo "✅ All dependencies installed"

install-backend:
	@echo "📦 backend (poetry)..."
	cd backend && poetry install

install-aml:
	@echo "📦 aml-backend (poetry)..."
	cd aml-backend && poetry install

# --legacy-peer-deps matches docker/Dockerfile.frontend and
# Dockerfile.frontend-backend. Required, not cosmetic: the root pins
# @leafygreen-ui/leafygreen-provider@^3.2.0 while @leafygreen-ui/avatar@^2.0.10
# peer-requires ^4.0.7, so a strict install fails with ERESOLVE.
install-frontend:
	@echo "📦 frontend (npm)..."
	cd frontend && npm install --legacy-peer-deps

update:
	cd backend && poetry update
	cd aml-backend && poetry update

# ─── Development (auto-reload) ───────────────────────────────────────────────────
# Both backends are started via `poetry run uvicorn` rather than `python main.py`:
#   - backend/main.py has its __main__ block commented out, so it would do nothing.
#   - aml-backend/main.py defaults PORT to 8000, colliding with the fraud API.

dev: dev-stop
	@echo "🚀 Starting all services with auto-reload..."
	@mkdir -p logs
	@(cd backend && poetry run uvicorn main:app --host 0.0.0.0 --port $(FRAUD_PORT) --reload) > logs/fraud.log 2>&1 & echo $$! > logs/fraud.pid
	@(cd aml-backend && poetry run uvicorn main:app --host 0.0.0.0 --port $(AML_PORT) --reload) > logs/aml.log 2>&1 & echo $$! > logs/aml.pid
	@(cd frontend && PORT=$(FRONTEND_PORT) npm run dev) > logs/frontend.log 2>&1 & echo $$! > logs/frontend.pid
	@sleep 4
	@echo "✅ All services started!"
	@echo "   📊 Frontend:    http://localhost:$(FRONTEND_PORT)"
	@echo "   🕵️  Fraud API:   http://localhost:$(FRAUD_PORT)/docs"
	@echo "   🔍 AML API:     http://localhost:$(AML_PORT)/docs"
	@echo ""
	@echo "   Transaction simulator: http://localhost:$(FRONTEND_PORT)/transaction-simulator"
	@echo ""
	@echo "📋 make dev-logs | make dev-status | make dev-stop"

dev-backend: dev-stop-backend
	@echo "🚀 Starting backend services..."
	@mkdir -p logs
	@(cd backend && poetry run uvicorn main:app --host 0.0.0.0 --port $(FRAUD_PORT) --reload) > logs/fraud.log 2>&1 & echo $$! > logs/fraud.pid
	@(cd aml-backend && poetry run uvicorn main:app --host 0.0.0.0 --port $(AML_PORT) --reload) > logs/aml.log 2>&1 & echo $$! > logs/aml.pid
	@sleep 3
	@echo "✅ Backend services started!"
	@echo "   🕵️  Fraud API:   http://localhost:$(FRAUD_PORT)/docs"
	@echo "   🔍 AML API:     http://localhost:$(AML_PORT)/docs"

dev-frontend: dev-stop-frontend
	@echo "🚀 Starting frontend..."
	@mkdir -p logs
	@(cd frontend && PORT=$(FRONTEND_PORT) npm run dev) > logs/frontend.log 2>&1 & echo $$! > logs/frontend.pid
	@sleep 2
	@echo "✅ Frontend started!  http://localhost:$(FRONTEND_PORT)"

dev-fraud:
	@echo "🚀 Starting fraud API..."
	@mkdir -p logs
	@lsof -ti :$(FRAUD_PORT) | xargs kill -9 2>/dev/null || true
	@(cd backend && poetry run uvicorn main:app --host 0.0.0.0 --port $(FRAUD_PORT) --reload) > logs/fraud.log 2>&1 & echo $$! > logs/fraud.pid
	@sleep 2
	@echo "✅ Fraud API:   http://localhost:$(FRAUD_PORT)/docs"

dev-aml:
	@echo "🚀 Starting AML API..."
	@mkdir -p logs
	@lsof -ti :$(AML_PORT) | xargs kill -9 2>/dev/null || true
	@(cd aml-backend && poetry run uvicorn main:app --host 0.0.0.0 --port $(AML_PORT) --reload) > logs/aml.log 2>&1 & echo $$! > logs/aml.pid
	@sleep 2
	@echo "✅ AML API:     http://localhost:$(AML_PORT)/docs"

dev-stop:
	@echo "🛑 Stopping all services..."
	@lsof -ti :$(FRAUD_PORT) | xargs kill -9 2>/dev/null || true
	@lsof -ti :$(AML_PORT) | xargs kill -9 2>/dev/null || true
	@lsof -ti :$(FRONTEND_PORT) | xargs kill -9 2>/dev/null || true
	@rm -f logs/*.pid
	@echo "✅ All services stopped"

dev-stop-backend:
	@echo "🛑 Stopping backend services..."
	@lsof -ti :$(FRAUD_PORT) | xargs kill -9 2>/dev/null || true
	@lsof -ti :$(AML_PORT) | xargs kill -9 2>/dev/null || true
	@rm -f logs/fraud.pid logs/aml.pid
	@echo "✅ Backend services stopped"

dev-stop-frontend:
	@echo "🛑 Stopping frontend..."
	@lsof -ti :$(FRONTEND_PORT) | xargs kill -9 2>/dev/null || true
	@rm -f logs/frontend.pid
	@echo "✅ Frontend stopped"

dev-logs:
	@echo "📋 Service Logs (press Ctrl+C to exit)"
	@echo "========================================"
	@tail -f logs/*.log 2>/dev/null || echo "No logs found. Run 'make dev' first."

dev-status:
	@echo "🔍 Service Status:"
	@echo "=================="
	@if lsof -ti :$(FRONTEND_PORT) > /dev/null 2>&1; then echo "✅ Frontend ($(FRONTEND_PORT)): Running"; else echo "❌ Frontend ($(FRONTEND_PORT)): Stopped"; fi
	@if lsof -ti :$(FRAUD_PORT) > /dev/null 2>&1; then echo "✅ Fraud    ($(FRAUD_PORT)): Running"; else echo "❌ Fraud    ($(FRAUD_PORT)): Stopped"; fi
	@if lsof -ti :$(AML_PORT) > /dev/null 2>&1; then echo "✅ AML      ($(AML_PORT)): Running"; else echo "❌ AML      ($(AML_PORT)): Stopped"; fi

dev-kill-all:
	@echo "💀 Killing all processes on ports 300* and 800*..."
	@for port in 3000 3001 3002 3003 3004 3005 3006 3007 3008 3009; do \
	        lsof -ti :$$port | xargs kill -9 2>/dev/null || true; \
	done
	@for port in 8000 8001 8002 8003 8004 8005 8006 8007 8008 8009 8080 8081; do \
	        lsof -ti :$$port | xargs kill -9 2>/dev/null || true; \
	done
	@rm -f logs/*.pid 2>/dev/null || true
	@echo "✅ All processes killed on ports 300*/800*"

# ─── Migration sanity checks ─────────────────────────────────────────────────────

env-check:
	@echo "🔧 Environment:"
	@if [ -z "$$MONGODB_URI" ]; then echo "❌ MONGODB_URI not set"; else echo "✅ MONGODB_URI set"; fi
	@echo "   backend/.env      : $$( [ -f backend/.env ] && echo present || echo MISSING )"
	@echo "   aml-backend/.env  : $$( [ -f aml-backend/.env ] && echo present || echo MISSING )"
	@echo "   frontend/.env.local: $$( [ -f frontend/.env.local ] && echo present || echo MISSING )"
	@echo ""
	@echo "   The fraud backend must point at $(DB). The picker reads"
	@echo "   NEXT_PUBLIC_API_URL/customers/ — if unset the dropdown is empty."

db-check:
	@if [ -z "$$MONGODB_URI" ]; then echo "❌ MONGODB_URI not set"; exit 1; fi
	@echo "🔎 Checking $(DB) (scoped counts must exclude Leafy Bank rows)"
	@mongosh "$$MONGODB_URI" --quiet --eval 'const d=db.getSiblingDB("$(DB)"), S={sourceSystem:"threatsight360"}; \
	        print("  customers   " + d.customers.countDocuments(S) + " / " + d.customers.countDocuments({}) + "   (want 554 / 558)"); \
	        print("  transactions " + d.transactions.countDocuments(S) + " / " + d.transactions.countDocuments({}) + " (want 21449 / 21762)"); \
	        print("  patterns     " + d.threatsightFraudPatterns.countDocuments(S) + "        (want 5)"); \
	        print("  simulator-written transactions: " + d.transactions.countDocuments({...S, createdBy:"simulator"}));'

# The 7 AML collections loaded AS-IS under renamed names by
# threat360-migration/populate_aml_asis.py. Unlike the fraud collections these are
# NOT sourceSystem-scoped — they are wholly ThreatSight's, so a plain count is right.
# The 5 search indexes on threatsightEntities build asynchronously: until every one
# reports queryable=true, entity search and hybrid search return empty with NO error.
aml-check:
	@if [ -z "$$MONGODB_URI" ]; then echo "❌ MONGODB_URI not set"; exit 1; fi
	@echo "🔎 Checking the AML collections in $(DB)"
	@mongosh "$$MONGODB_URI" --quiet --eval 'const d=db.getSiblingDB("$(DB)"); \
	        const want={threatsightEntities:504, threatsightRelationships:519, fraudEvaluation:12766, \
	                    threatsightAlerts:0, threatsightInvestigations:0, \
	                    threatsightTypologyLibrary:12, threatsightCompliancePolicies:6}; \
	        for (const [c,n] of Object.entries(want)) { \
	          const got=d[c].countDocuments({}); \
	          const ok = n===0 ? got>0 : got===n; \
	          print("  " + (ok?"✅":"❌") + " " + c.padEnd(30) + got + (n?"  (want "+n+")":"  (grows at runtime)")); } \
	        print(""); print("  search/vector indexes on threatsightEntities:"); \
	        d.threatsightEntities.getSearchIndexes().forEach(i => \
	          print("    " + (i.queryable?"✅":"⏳") + " " + i.name.padEnd(32) + i.status));'

