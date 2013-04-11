// temporary file
// @todo Remove this code when the version of forever-monitor will be grater than 1.1.0

var fs = require('fs'),
	path = require('path'),
	Monitor = require('forever-monitor').Monitor,
	forever = require('forever'),
	started;

//
// ### @function (file, pid)
// #### @file {string} Location of the pid file.
// #### @pid {number} pid to write to disk.
// Write the pidFile to disk for later use
//
function writePid(file, pid) {
	fs.writeFileSync(file, pid, 'utf8');
}

//
// ### @function start (options)
// #### @options {Object} Options for the `forever.Monitor` instance.
// Starts the child process and disconnects from the IPC channel.
//
function start(options) {
	var script = process.argv[2],
		monitor = new Monitor(script, options);
	
	forever.logEvents(monitor);
	monitor.start();

	monitor.on('start', function () {

		var worker = new forever.Worker({
			monitor: monitor,
			sockPath: forever.config.get('sockPath'),
			exitOnStop: true
		});
		
		worker.start();

		//
		// Disconnect the IPC channel, letting this monitor's parent process know
		// that the child has started successfully.
		//
		process.disconnect();
    
		//
		// Write the pidFile to disk
		//
		writePid(options.pidFile, monitor.child.pid);
	});
  
	//
	// When the monitor restarts update the pid in the pidFile
	//
	monitor.on('restart', function () {
		writePid(options.pidFile, monitor.child.pid);
	});

	//
	// When the monitor stops or exits, remove the pid and log files
	//
	function cleanUp(){
		try {
			fs.unlinkSync(options.pidFile);
		}
		catch(e){}
	}
	monitor.on('stop', cleanUp);
	monitor.on('exit', cleanUp);
};

//
// When we receive the first message from the parent process, start
// an instance of `forever.Monitor` with the options supplied.
//
process.on('message', function (data) {
	
	//
	// TODO: Find out if this data will ever get split into two message events.
	//
	var options = JSON.parse(data.toString());
	
	if (!started) {
		started = true;
		start(options);
	}
});