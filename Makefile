# One command per thing you do on stage.
.DEFAULT_GOAL := help
COMPOSE := docker compose
# Prefer the local virtualenv when it exists, so `make test` just works.
PYTHON ?= $(shell [ -x .venv/bin/python ] && echo .venv/bin/python || echo python3)

help:   ## show this help
	@grep -hE '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) | awk -F':.*?## ' '{printf "  \033[1m%-16s\033[0m %s\n", $$1, $$2}'

demo:   ## start the whole pipeline (broker, db, redis, laya, backend, simulator, frontend, landing)
	$(COMPOSE) up -d --build
	@echo "App        http://localhost:5173"
	@echo "Landing    http://localhost:5174"
	@echo "API        http://localhost:8000/api/trucks"
	@echo "WebSocket  ws://localhost:8000/ws/live"
	@echo "Docs       http://localhost:8000/docs"

stop:   ## stop everything, keep the database volume
	$(COMPOSE) down

nuke:   ## stop everything AND delete containers, volumes, images and build cache
	$(COMPOSE) down -v --rmi local
	docker builder prune -f

status: ## show what is running and whether the API is healthy
	@$(COMPOSE) ps
	@printf "\nAPI health: "
	@curl -fsS http://localhost:8000/healthz 2>/dev/null || echo "backend not reachable"

clean:  ## stop and delete the database volume
	$(COMPOSE) down -v

logs:   ## follow the backend log
	$(COMPOSE) logs -f backend

sim-logs: ## follow the simulator log
	$(COMPOSE) logs -f simulator

laya-pull: ## download the Laya checkpoints once (~1.4 GB), before the demo
	$(COMPOSE) run --rm --no-deps laya python -c "import laya; laya.load('convaiinnovations/laya'); laya.load('convaiinnovations/laya', subfolder='multilingual'); print('Laya checkpoints cached in the laya_models volume')"

laya-logs: ## follow the Laya (System 1) service log
	$(COMPOSE) logs -f laya

build-legacy: ## build all images with the legacy builder (use if BuildKit hangs)
	DOCKER_BUILDKIT=0 $(COMPOSE) build

control: ## print the standalone manual-control panel (drive any truck by hand)
	@echo "Manual control panel: http://localhost:8000/control"

watch:  ## watch raw telemetry on MQTT
	mosquitto_sub -h localhost -t 'coldchain/#' -v

present: ## run the on-stage story: preflight, reset, then four trucks on a timeline
	$(PYTHON) scripts/present.py

present-check: ## preflight only: is the live feed fresh and is there one simulator?
	$(PYTHON) scripts/present.py --check

reset:  ## reset every simulated truck to NORMAL
	curl -fsS -X POST http://localhost:8000/api/simulation/reset && echo " reset"

SCENARIO ?= REFRIGERATION_FAILURE
TRUCK ?= T102
BATCH ?= CHK-1029

scenario:  ## set a scenario: make scenario SCENARIO=DOOR_LEFT_OPEN TRUCK=T102
	curl -fsS -X POST http://localhost:8000/api/simulation/scenario \
		-H 'content-type: application/json' \
		-d '{"truckId":"$(TRUCK)","scenario":"$(SCENARIO)"}' && echo

predict:  ## Person 4 intelligence: make predict BATCH=CHK-1029
	curl -fsS http://localhost:8000/api/predictions/$(BATCH) | python3 -m json.tool

test:   ## run the test suite (no broker, no database)
	$(PYTHON) -m pytest tests/ -q

dev-backend:  ## run the backend on the host with reload
	$(PYTHON) -m uvicorn backend.main:app --reload --port 8000

dev-sim:      ## run the simulator on the host, printing messages
	$(PYTHON) sensor-simulator/simulator.py --broker localhost --interval 3

dev-sim-dry:  ## run the simulator with no broker, printing a few ticks
	$(PYTHON) sensor-simulator/simulator.py --dry-run --ticks 5

dev-web:      ## run the frontend dev server on the host (needs the backend on :8000)
	cd frontend && npm install && npm run dev

dev-nobroker: ## the whole pipeline on one host, no broker/db/docker
	$(PYTHON) scripts/dev_no_broker.py

dev-landing:  ## run the static landing page on :5174 (no backend needed)
	cd landing && npm install && npm run dev

build-landing: ## build the landing page into landing/dist
	cd landing && npm install && npm run build

.PHONY: help demo stop nuke status clean logs sim-logs laya-pull laya-logs build-legacy control watch present present-check reset scenario predict test dev-backend dev-sim dev-sim-dry dev-web dev-nobroker dev-landing build-landing
