const _ = require('lodash');
var debug = require('debug')('throttle:main');
const Lock = require('@momsfriendlydevco/lock');
const { resolve } = require('path');

let Throttle = class {
	constructor(options) {
		this.settings = {
			...Throttle.defaults,
			..._.isPlainObject(options) ? options : {},
		};
		debug('settings', this.settings);

		// NOTE: We want this to be application wide.
		// Implementation should be single instance.
		// TODO: Should we return a "singleton" with `module.exports = new Throttle()`?
		this.pending = [];

		this.lock = new Lock(this.settings.lock);
	};

	init() {
		debug('init');
		return this.lock.init();
	};

	// TODO: hook up.
	destroy() {
		debug('destroy');
		return this.lock.destroy();
	};

	throttle(options) {
		/*
		this.settings = {
			...this.settings,
			..._.isPlainObject(options) ? options : {},
		};
		*/
		//debug('throttle', this.settings, options);
		debug('throttle', options.id, options.hash);

		// TODO: validate options.hash
		return new Promise((resolve, reject) => {
			var handler = (cb) => {

				// Allow passing in a function to begin next item in queue
				if (cb) options.onLocked = cb;

				Promise.resolve()
					.then(()=> this.lock.create(options.hash)) // Try to lock
					.then(didLock => {
						debug('didLock', didLock);
						if (didLock) { // New request - pass on middleware and wait until its concludes

							// Callback for onUnlocked to release lock and finish queue.
							var done = () => Promise.resolve()
								.then(() => {
									debug('Releasing lock');
									// FIXME: Edge-case where lock exists but server has rebooted meaning the lock is never released.
									this.lock.release(options.hash);
									
									if (this.pending.length > 0) {
										// Execute first pending request
										//handler(...this.pending.shift());
										handler(this.pending.shift());
									}
								})
								.then(() => {
									debug('Promise resolved');
									resolve();
								});
								
							// Call next item in middleware which (should) eventually call res.end() which gets duck-typed above
							//next();
							debug('Calling onUnlocked', _.isFunction(options.onUnlocked));
							if (_.isFunction(options.onUnlocked)) {
								options.onUnlocked.call(this, done);
							} else {
								done();
							}
						} else { // Already locked - execute response() and exit

							// TODO: `settings.leading = true`, could be `settings.queue = 0`
							if (this.settings.leading) {
								//settings.response(req, res);
								if (_.isFunction(options.onLocked)) options.onLocked.call(this);
							} else {
								// Respond to first pending when over queue length
								while (this.pending.length >= this.settings.queue) {
									debug('Fire pending', this.pending.length);
									//settings.response(...pending.shift());
									this.pending.shift().call(this);
								}
								if (this.settings.queue > 0) {
									// Add request to pending
									debug('Add to pending');
									//pending.unshift([req, res, next]);
									if (_.isFunction(options.onLocked)) this.pending.unshift(options.onLocked);
									this.pending.length = this.settings.queue;
								}
							}

							// FIXME: Reject?
							resolve();
						}

					});
				
			};

			handler();
			//return handler;

			// TODO: Return a promise? Which resolves when?
		});
	};
};

Throttle.defaults = {
	lock: {},
	leading: true,
	queue: 1,
};

module.exports = Throttle;