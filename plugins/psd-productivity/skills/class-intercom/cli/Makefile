.PHONY: build test lint install clean

build:
	go build -o bin/classintercom-pp-cli ./cmd/classintercom-pp-cli

test:
	go test ./...

lint:
	golangci-lint run

install:
	go install ./cmd/classintercom-pp-cli

clean:
	rm -rf bin/

build-mcp:
	go build -o bin/classintercom-pp-mcp ./cmd/classintercom-pp-mcp

install-mcp:
	go install ./cmd/classintercom-pp-mcp

build-all: build build-mcp
