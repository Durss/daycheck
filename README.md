# Day Check
Simple app to track your progress on a task you want to achieve every day for a specific amount of days.  
See it at :  
https://daycheck.fr

In its current state, the server code only serves static files and manages the history mode of the vue router by redirecting all URLs to index.html.

## Environment setup
Install Node :
https://nodejs.org/en/download/

Install typescript :
```
npm install -g typescript
```


## Project setup
```
npm install
```

### Compiles and hot-reloads frontend AND server for development
```
npm run dev
```

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