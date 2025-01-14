const Service = require('node-windows').Service;

// Create a new service object
const svc = new Service({
  name: 'SerienDownloader',
  description: 'An Express app running as a Windows service.',
  script: 'C:\\Users\\home\\Documents\\source\\serienstreamDownloader\\app.js',
  nodeOptions: [
    '--harmony', // Optional Node.js options
    '--max_old_space_size=4096' // Optional memory limit
  ]
});

// Listen for the "install" event
svc.on('install', () => {
  svc.start();
});

// Install the service
svc.install();
