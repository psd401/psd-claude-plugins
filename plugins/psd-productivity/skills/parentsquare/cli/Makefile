.PHONY: build test lint install clean

build:
	go build -o bin/parentsquare-pp-cli ./cmd/parentsquare-pp-cli

test:
	go test ./...

lint:
	golangci-lint run

install:
	go install ./cmd/parentsquare-pp-cli

clean:
	rm -rf bin/

build-mcp:
	go build -o bin/parentsquare-pp-mcp ./cmd/parentsquare-pp-mcp

install-mcp:
	go install ./cmd/parentsquare-pp-mcp

build-all: build build-mcp
