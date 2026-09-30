.PHONY: setup dev check
setup:
	python3 scripts/setup.py
dev:
	backend/.venv/bin/python scripts/dev.py
check:
	backend/.venv/bin/python scripts/check.py
