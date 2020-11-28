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
		// TODO: Should queue be by hash?
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
		debug('throttle', options.id, options.hash);

		// TODO: validate options.hash
		return new Promise((resolve, reject) => {
			var handler = current => {
				// Store callback so that pending promises can be resolved later
				if (!_.isFunction(current.resolve)) current.resolve = resolve;
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
											return handler(this.pending.shift());
										}
									})
									.then(() => {
										debug('Resolving promise', current.notes, _.isFunction(current.resolve));
										current.resolve();
									});
							};

							// Proceed with current item
							debug('Calling onUnlocked', _.isFunction(current.onUnlocked));
							if (_.isFunction(current.onUnlocked)) {
								current.onUnlocked.call(this).then(() => done());
							} else {
								done();
							}
						} else { // Already locked - execute response() and exit

							// TODO: `settings.leading = true`, could be `settings.queue = 0`
							if (this.settings.leading) {
								debug('Fire leading');
								if (_.isFunction(current.onLocked)) current.onLocked.call(this);
								debug('Resolving promise', current.notes, _.isFunction(current.resolve));
								current.resolve();
							} else {
								// Respond to first pending when over queue length
								while (this.pending.length >= this.settings.queue) {
									debug('Fire pending', this.pending.length);
									var item = this.pending.shift();
									if (_.isFunction(item.onLocked)) item.onLocked.call(this);
									item.resolve();
								}
								if (this.settings.queue > 0) {
									// Add request to pending
									debug('Add to pending');
									this.pending.unshift(current);
									if (this.pending.length > this.settings.queue) this.pending.length = this.settings.queue;
								} else {
									// Queued items don't resolve right away but others do
									debug('Resolving promise', current.notes, _.isFunction(current.resolve));
									current.resolve();
								}
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