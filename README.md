
# Nest sample code

This is sample nestjs project.
- link: https://nestjs.com


## Prerequisites

Please install node.js and I recommend to use docker for your database.

My recommand node.js version is dubnium and latest docker version.

* Install node.js: [https://nodejs.org/en/download/](https://nodejs.org/en/download/)

* Install Docker Desktop for MAC: [https://docs.docker.com/docker-for-mac/install/](https://docs.docker.com/docker-for-mac/install/)

* Install Docker Desktop for Windows: [https://docs.docker.com/docker-for-windows/install/](https://docs.docker.com/docker-for-windows/install/)

* Install compose: [https://docs.docker.com/compose/install/](https://docs.docker.com/compose/install/)

## Create development environment

First, clone this repository into your local environment. Run followed command in your terminal.

```bash
  git clone https://github.com/kyhsa93/nestJS-sample.git
```

Second step, install package that needed in this project.

If your node.js environment is successly downloaded, you can use node package manager.

Run followed command in your terminal.

```bash
  npm install
```



You can start api with followed command.

```bash
  npm start
```

And if you modify code and save, you can see the process detect code changes and restart it self.

## Start with docker

If you can use docker cli, you can build docker image.

```bash
  docker build -t nest-sample
  docker images # list up docker images
```

And then you can create and run docker container using builded image.

```bash
  docker run -d -p 3000:3000 nest-sample
  docker ps # list up running container
```

and now you can connect api through http://localhost:3000.

## Start with docker compose

Docker compose in this project is include api.

Run followed command in project directory.

```bash
  docker-compose up -d # build images, create and run containers in background
```

If container is created, you can access api on http://localhost:3000.



If you want apply your modified code into the running container, you can add build option.

```bash
  docker-compose up -d --build # if source code is changed, rebuidl image, recreate and start container
```

After use compose, you have to stop and remove containers.

```bash
  docker-compose down # stop and remove container in compose
```

## Configuration

## Documantaion

Documentaion about this project is made swagger.

Start this api and connect http://localhost:3000/api in your browser.
