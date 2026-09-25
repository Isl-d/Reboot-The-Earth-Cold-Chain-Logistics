# One command per thing you do on stage.
.DEFAULT_GOAL := help
COMPOSE := docker compose
# Prefer the local virtualenv when it exists, so `make test` just works.
PYTHON ?= $(shell [ -x .venv/bin/python ] && echo .venv/bin/python || echo python3)

help:   ## show this help
	@grep -hE '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) | awk -F':.*?## ' '{printf "  \033[1m%-16s\033[0m %s\n", $$1, $$2}'

demo:   ## start the whole pipeline (broker, db, redis, backend, simulator)
	$(COMPOSE) up -d --build
	@echo "API        http://localhost:8000/api/trucks"
	@echo "WebSocket  ws://localhost:8000/ws/live"
	@echo "Docs       http://localhost:8000/docs"

stop:   ## stop everything, keep the database volume
	$(COMPOSE) down

clean:  ## stop and delete the database volume
	$(COMPOSE) down -v

logs:   ## follow the backend log
	$(COMPOSE) logs -f backend

sim-logs: ## follow the simulator log
	$(COMPOSE) logs -f simulator

watch:  ## watch raw telemetry on MQTT
	mosquitto_sub -h localhost -t 'coldchain/#' -v

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

dev-nobroker: ## the whole pipeline on one host, no broker/db/docker
	$(PYTHON) scripts/dev_no_broker.py

.PHONY: help demo stop clean logs sim-logs watch reset scenario predict test dev-backend dev-sim dev-sim-dry dev-nobroker