# Manage containers state
start:
	docker-compose up

stop:
	docker-compose down

start-network:
	docker-compose -f docker-compose.network.yml up

stop-network:
	docker-compose -f docker-compose.network.yml down

switch-node-initial:
	make configure-initial
	make restart-bigchaindb

switch-node-1:
	make configure-node-1
	make restart-bigchaindb

restart-bigchaindb:
	docker stop blockchain-api_bigchaindb_1
	docker start blockchain-api_bigchaindb_1


# Enter containers
bigchaindb:
	docker exec -it blockchain-api_bigchaindb_1 bash

mongodb_blockchain:
	docker exec -it blockchain-api_mongodb_blockchain_1 bash

mongodb_node_1:
	docker exec -it blockchain-api_mongodb_node_1_1 bash


# Configure
install:
  # Original configuration command, interchanged with `configure-install`
	# docker exec -it blockchain-api_bigchaindb_1 bash -c "bigchaindb -y configure mongodb"

	# Copied config file into container with added keyring keys and MongoDB node setup
	make configure-initial

	# configure replica-set
	docker exec -it blockchain-api_bigchaindb_1 bash -c "bigchaindb add-replicas mongodb_node_1:27017 mongodb_node_2:27017 mongodb_node_3:27017 mongodb_node_4:27017"

	# initialize database
	docker exec -it blockchain-api_bigchaindb_1 bash -c "bigchaindb init"

configure-initial:
	docker cp .bigchaindb blockchain-api_bigchaindb_1:/data/.bigchaindb

configure-node-1:
	docker cp .bigchaindb-node-1 blockchain-api_bigchaindb_1:/data/.bigchaindb

flush-database:
	docker exec -it blockchain-api_bigchaindb_1 bash -c "bigchaindb -y drop"
	docker exec -it blockchain-api_bigchaindb_1 bash -c "bigchaindb init"


# Misc
logs:
	docker logs -f blockchain-api_bigchaindb_1

docker-stats:
	docker stats
