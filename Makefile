
VERSION=$(shell node -e 'console.log(require("./package.json").version)')

nginx:
	docker rm -f nginx || true
	docker run \
		--name nginx \
		-d \
		-v `pwd`/conf.d:/etc/nginx/conf.d \
		-p 80:80 \
		--network composer_default \
		nginx 

#-c Admin@trt.xuyuntech.com-cert.pem -k 8e12c2c5efb8facfc6d71c565b518d24612cad684c0f2cb4b9506b49ebd89b68_sk
importAdmin:
	rm -rf ~/.composer
	composer card create -p artifacts/connection.json -u admin -s adminpw -r PeerAdmin -r ChannelAdmin
	composer card import -f admin@trt-health.card
install-network:
	composer archive create -t dir -n ./composer
	composer network install -c admin@trt-health -a trt-health@${VERSION}.bna -o npmrcFile=`pwd`/.npmrc
upgrade-network: install-network
	composer network upgrade -c admin@trt-health -n trt-health -V ${VERSION} -o npmrcFile=`pwd`/.npmrc
composer: importAdmin install-network
	sleep 5s
	composer network start --networkName trt-health --networkVersion ${VERSION} -A ComposerAdmin -S adminpw -c admin@trt-health -o npmrcFile=`pwd`/.npmrc
	sleep 5s
	composer card import -f ComposerAdmin@trt-health.card
	composer network ping -c ComposerAdmin@trt-health

postgres:
	docker rm -f postgres || true
	docker run -d --name postgres -p 5432:5432 -e POSTGRES_USER=fabric -e POSTGRES_PASSWORD=fabricpw -e POSTGRES_DB=fabric_ca postgres:9-alpine

rest-server:
	composer-rest-server -c ComposerAdmin@trt-health -n never -w true

clear:
	rm -rf *.bna *.card 
	rm -rf fabric-client-kv-trt/*
	rm -rf fabric-client-kv-trt-crypto-suite/*
