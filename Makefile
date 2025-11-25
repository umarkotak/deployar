APP_NAME = deployar

run:
	go run .

bin:
	@echo "Start building binaries..."
	@GOEXPERIMENT=greenteagc,jsonv2 go build -o pkg/"${APP_NAME}" .
	@chmod +x pkg/"${APP_NAME}"
	@echo "Finish build"

bin_run:
	./pkg/"${APP_NAME}"

loadtest_get_ads_sequence:
	k6 run load_testing/get_ads_sequence.js \
		--summary-export load_testing/results/get_ads_sequence_summary.json

loadtest_get_ads_playlist:
	k6 run load_testing/get_ads_playlist.js \
		--summary-export load_testing/results/get_ads_playlist_summary.json

# APP DEPLOYMENT

deploy:
	git pull --rebase origin master
	$(MAKE) bin
	@echo "Restarting $(SERVICE_NAME) after deploy..."
	@sudo systemctl restart $(SERVICE_NAME)
	@echo "Deploy done!"

SERVICE_NAME := $(APP_NAME).service
SYSTEMD_DIR := /etc/systemd/system

install-service:
	@echo "Installing service file to $(SYSTEMD_DIR)..."
	@sudo cp $(SERVICE_NAME) $(SYSTEMD_DIR)/$(SERVICE_NAME)
	@sudo systemctl daemon-reload
	@echo "Service installed successfully!"

uninstall-service:
	@echo "Uninstalling service..."
	@sudo systemctl stop $(SERVICE_NAME) 2>/dev/null || true
	@sudo systemctl disable $(SERVICE_NAME) 2>/dev/null || true
	@sudo rm -f $(SYSTEMD_DIR)/$(SERVICE_NAME)
	@sudo systemctl daemon-reload
	@echo "Service uninstalled successfully!"

start:
	@echo "Starting $(SERVICE_NAME)..."
	@sudo systemctl start $(SERVICE_NAME)
	@echo "Service started!"

stop:
	@echo "Stopping $(SERVICE_NAME)..."
	@sudo systemctl stop $(SERVICE_NAME)
	@echo "Service stopped!"

restart:
	@echo "Restarting $(SERVICE_NAME)..."
	@sudo systemctl restart $(SERVICE_NAME)
	@echo "Service restarted!"

enable:
	@echo "Enabling $(SERVICE_NAME) to start on boot..."
	@sudo systemctl enable $(SERVICE_NAME)
	@echo "Service enabled!"

disable:
	@echo "Disabling $(SERVICE_NAME) from starting on boot..."
	@sudo systemctl disable $(SERVICE_NAME)
	@echo "Service disabled!"

status:
	@sudo systemctl status $(SERVICE_NAME)

logs:
	@sudo journalctl -u $(SERVICE_NAME) -f --output cat

pull:
	git pull --rebase origin master
