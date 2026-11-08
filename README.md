![Icon](https://github.com/Durss/daycheck/blob/master/public/favicon.png)

# Day Check

Simple app to track your progress on a task you want to achieve every day for a specific amount of days.  
See it at :  
https://daycheck.fr

Frontend is built with Vue 3 + Vite, server is a tiny Express app.  
The server serves static files, manages the history mode of the vue router by redirecting all URLs to index.html, and stores calendars.

## Calendars storage

Calendars are stored on the server as one JSON file per calendar, in the folder defined by the `DATA_PATH` environment variable (`./data` by default, `/app/data` in docker).  
Browsers keep a local copy (so the app works offline) and sync it with the server.

There are no user accounts: a calendar's ID (a random UUID, visible in its URL) is what grants access to it. There is no way to list calendars, so keep the URL of your calendars if you want to get them back after clearing your browser data.

### Environment variables

| Variable           | Default   | Description                                                                                                                                                                                                                                                                    |
| ------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DATA_PATH`        | `./data`  | Folder where calendars are stored                                                                                                                                                                                                                                              |
| `MAX_CALENDARS`    | `10000`   | Maximum number of calendars. New calendars are refused once reached                                                                                                                                                                                                            |
| `MAX_STORAGE_MB`   | `200`     | Maximum disk space used by calendars                                                                                                                                                                                                                                           |
| `PURGE_AFTER_DAYS` | `365`     | Calendars not modified for this number of days are deleted, based on their file modification date. `0` disables it                                                                                                                                                             |
| `TRUST_PROXY`      | _(empty)_ | Set to `1` if the app runs behind one reverse proxy (nginx, traefik, caddy...) so rate limiting sees real client IPs. Leave empty if clients reach the app directly, otherwise they can spoof their IP. See [express docs](https://expressjs.com/en/guide/behind-proxies.html) |

## Environment setup

Install Node 22.12+ (24 LTS recommended) :
https://nodejs.org/en/download/

## Project setup

```
npm install
```

### Compiles and hot-reloads frontend AND server for development

```
npm run dev
```

Frontend dev server runs on http://localhost:5173 and proxies `/api` calls to the API server.  
The API server is compiled in watch mode and runs on http://localhost:3003, restarting automatically on every change. Calendars are stored in `./data`.

### Compiles and minifies frontend AND server for production

```
npm run build
```

### Run server

```
node server/bootstrap.js
```

Run it as a service with PM2 :

```
pm2 start bootstrap-pm2.json
```

## Run with Docker

A multi-stage `Dockerfile` builds the frontend and the server, then ships only the
production dependencies and the compiled output. The app is served on port `3003`.

Calendars are stored in `/app/data` inside the container: **always mount a volume there**, otherwise they're lost when the container is recreated (eg: on update).

First, create the volume once :

```
docker volume create daycheck-data
```

Then build and run with Docker :

```
docker build -t daycheck .
docker run -d -p 3003:3003 -v daycheck-data:/app/data --name daycheck daycheck
```

Or with Docker Compose (the volume is declared as external so compose never deletes it, not even with `docker compose down -v`) :

```
docker compose up -d --build
```

To update, rebuild and restart, the calendars stay in the volume :

```
git pull
docker compose up -d --build
```

To backup calendars, copy the volume's content :

```
docker run --rm -v daycheck-data:/data -v "$PWD":/backup alpine tar czf /backup/daycheck-data.tgz -C /data .
```

If you prefer a host folder instead of a docker volume (bind mount), make sure it's writable by the container user (uid `1000`) :

```
mkdir -p ./data && sudo chown 1000:1000 ./data
docker run -d -p 3003:3003 -v "$PWD/data":/app/data --name daycheck daycheck
```

Then open http://localhost:3003
