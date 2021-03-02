const _ = require('lodash');
const debug = require('debug')('throttle:main');
const Lock = require('@momsfriendlydevco/lock');

let Throttle = class {
	constructor(options) {
		this.settings = {
			...Throttle.defaults,
			..._.isPlainObject(options) ? options : {},
		};
		//debug('settings', this.settings);

		if (this.settings.leading) this.settings.queue = 0;

		// NOTE: We want this to be application wide.
		// Implementation should be single instance.
		// TODO: Should we return a "singleton" with `module.exports = new Throttle()`?
		this.pending = [];

		// Support passing in an existing Lock instance.
		if (this.settings.lock instanceof Lock) {
			debug('Using existing Lock instance');
			this.lock = this.settings.lock;
		} else {
			debug('Creating Lock instance');
			this.lock = new Lock(this.settings.lock);
		}
	};

	init() {
		debug('init');
		// Support passing in an existing Lock instance.
		if (this.settings.lock instanceof Lock) {
			debug('No need to initialise existing Lock instance');
			return Promise.resolve();
		} else {
			debug('Initialising Lock instance');
			return this.lock.init();
		}
	};

	// TODO: hook up.
	destroy() {
		debug('destroy');
		return this.lock.destroy();
	};

	throttle(worker, options) {
		debug('throttle', _.isFunction(worker), options.id, options.hash);

		// TODO: validate options.hash
		return new Promise((resolve, reject) => {
			var handler = current => {
				// Store callback so that pending promises can be resolved later
				if (!_.isFunction(current.worker)) current.worker = worker;
				if (!_.isFunction(current.resolve)) current.resolve = resolve;
				if (!_.isFunction(current.reject)) current.reject = reject;
				//debug('Current', current);

				Promise.resolve()
					.then(()=> this.lock.create(current.hash)) // Try to lock
					.then(didLock => {
						debug('didLock', didLock);
						if (didLock) { // New request - pass on middleware and wait until its concludes

							// Callback for onUnlocked to release lock and finish queue.
							var done = () => {
								debug('Releasing lock');
								return this.lock.release(current.hash)
									.then(() => {
										debug('Pending', this.pending.length);
										if (this.pending.length > 0) {
											// Execute next pending request
											debug('Handling next pending');
											// FIXME: Call stack depth? Decouple with setTimeout?
											// No need to return this promise as current is not waiting for other pending promises.
											handler(this.pending.shift());
										}
									})
									.then(() => {
										debug('Resolving promise', current.notes, _.isFunction(current.resolve));
										current.resolve();
									});
							};

							// Proceed with current item
							debug('Calling worker', _.isFunction(current.worker));
							if (_.isFunction(current.worker)) {
								current.worker.call(this).then(() => done());
							} else {
								done();
							}
						} else { // Already locked - execute response() and exit

							if (this.settings.queue === 0) {
								debug('Fire leading');
								debug('Rejecting promise', current.notes, _.isFunction(current.reject));
								current.reject(new Error('Throttle queue is full'));
							} else {
								// Respond to first pending when over queue length
								while (this.pending.length >= this.settings.queue) {
									debug('Fire pending', this.pending.length);
									var item = this.pending.shift();
									debug('Rejecting promise', item.notes, _.isFunction(item.reject));
									item.reject(new Error('Throttle queue is full'));
								}
								// Add request to pending
								debug('Add to pending');
								this.pending.unshift(current);
								if (this.pending.length > this.settings.queue) this.pending.length = this.settings.queue;
							}

						}

					});
				
			};

			handler(options);
		});

	};
};

Throttle.defaults = {
	lock: {},
	leading: true,
	queue: 1,
};

module.exports = Throttle;