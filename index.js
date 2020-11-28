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

		if (this.settings.leading) this.settings.queue = 0;

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
				if (!_.isFunction(current.reject)) current.reject = reject;
				//debug('Current', current);

				Promise.resolve()
					.then(()=> this.lock.create(current.hash)) // Try to lock
					.then(didLock => {
						debug('didLock', didLock);
						if (didLock) { // New request - pass on middleware and wait until its concludes

							debug('Resolving promise', current.notes, _.isFunction(current.resolve));
							current.resolve(current);

							/*
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
									// FIXME: We can resolve this one before waiting for next handler?
									.then(() => {
										debug('Resolving promise', current.notes, _.isFunction(current.resolve));
										current.resolve();
									});
							};

							// Proceed with current item
							debug('Calling onUnlocked', _.isFunction(current.onUnlocked));
							if (_.isFunction(current.onUnlocked)) {
								// FIXME: Hmm if this is called before resolving then maybe idea of using promises isn't so good
								current.onUnlocked.call(this).then(() => done());
							} else {
								done();
							}
							*/
						} else { // Already locked - execute response() and exit

							if (this.settings.queue === 0) {
								debug('Fire leading');
								//if (_.isFunction(current.onLocked)) current.onLocked.call(this);
								debug('Rejecting promise', current.notes, _.isFunction(current.reject));
								current.reject(new Error('Queue full'));
							} else {
								// Respond to first pending when over queue length
								while (this.pending.length >= this.settings.queue) {
									debug('Fire pending', this.pending.length);
									var item = this.pending.shift();
									//if (_.isFunction(item.onLocked)) item.onLocked.call(this);
									debug('Rejecting promise', item.notes, _.isFunction(item.reject));
									item.reject(new Error('Queue full'));
								}
								//if (this.settings.queue > 0) {
								// Add request to pending
								debug('Add to pending');
								this.pending.unshift(current);
								if (this.pending.length > this.settings.queue) this.pending.length = this.settings.queue;
								//}
								/* else {
									// Queued items don't resolve right away but others do
									debug('Resolving promise', current.notes, _.isFunction(current.resolve));
									current.resolve();
								}
								*/
							}

						}

					});
				
			};

			handler(options);
		})
		// FIXME: We can't wait for a then attached elsewhere to complete.
		.finally(() => {
			debug('finally')
			return;
			debug('Releasing lock', current.notes);
			return this.lock.release(current.hash)
				.then(() => {
					debug('Pending', this.pending.length);
					if (this.pending.length > 0) {
						// Execute next pending request
						debug('Handling next pending');
						// FIXME: Call stack depth? Decouple with setTimeout?
						return handler(this.pending.shift());
					}
				});
		})
		

	};
};

Throttle.defaults = {
	lock: {},
	leading: true,
	queue: 1,
};

module.exports = Throttle;