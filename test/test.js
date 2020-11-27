var _ = require('lodash');
var chai = require('chai')
var expect = chai.expect;
var spies = require('chai-spies');
var mlog = require('mocha-logger');

chai.use(spies);

var Sut = require('..');
const { resolve } = require('path');

describe('@momsfriendlydevco/throttle', ()=> {
	var sut;
	before('set up the module', ()=> sut = new Sut());
	before('initalize', ()=> sut.init().then(() => sut.lock.clear()));
	after('destroy', ()=> sut.destroy());

	it('should fire onUnlocked when available', ()=> {
		var options = {
			id: 'test',
			hash: ({test: 'should fire onUnlocked when available'}),
			onLocked: () => {
				console.log('onLocked');
			},
			onUnlocked: () => {
				console.log('onUnlocked');
				return Promise.resolve();
			},
		};
		chai.spy.on(options, 'onUnlocked');

		return Promise.resolve()
			.then(() => sut.throttle(options))
			.then(() => expect(options.onUnlocked).to.have.been.called());
	});

	it('should fire onLocked when already requested', ()=> {
		var options = {
			id: 'test',
			hash: ({test: 'should fire onLocked when already requested'}),
			onLocked: () => {
				console.log('onLocked');
			},
			onUnlocked: () => {
				console.log('onUnlocked');
				return new Promise((resolve, reject) => {
					setTimeout(() => {
						console.log('Finished waiting');
						resolve();
					}, 250);
				});
			},
		};
		chai.spy.on(options, 'onLocked');

		return Promise.all([
				sut.throttle(_.clone(options)),
				sut.throttle(_.clone(options)),
			])
			.then(() => expect(options.onLocked).to.have.been.called());
	});

	it('should fire callbacks in FILO order', ()=> {
		sut.settings.leading = false;
		sut.settings.queue = 3;

		var options = {
			id: 'test',
			hash: ({test: 'should fire onLocked in FILO order'}),
		};

		var order = [];

		return Promise.resolve()
			// This first attempt creates a lock
			.then(() => {sut.throttle({
				...options,
				onLocked: () => {
					console.log('onLocked', 0);
					order.push(0);
				},
				onUnlocked: () => {
					console.log('onUnlocked', 0);
					return new Promise((resolve, reject) => {
						setTimeout(() => {
							console.log('Finished waiting');
							order.push(0);
							resolve();
						}, 250);
					});
				},
				notes: 0,
			})}) // Don't return and wait for this promise.
			// Subsequent attempts are queued
			.then(() => Promise.all([
				sut.throttle({
					...options,
					onLocked: () => {
						console.log('onLocked', 1);
						order.push(1);
					},
					onUnlocked: () => {
						console.log('onUnlocked', 1);
						return new Promise((resolve, reject) => {
							setTimeout(() => {
								console.log('Finished waiting');
								order.push(1);
								resolve();
							}, 250);
						});
					},
					notes: 1,
				}),
				sut.throttle({
					...options,
					onLocked: () => {
						console.log('onLocked', 2);
						order.push(2);
					},
					onUnlocked: () => {
						console.log('onUnlocked', 2);
						return new Promise((resolve, reject) => {
							setTimeout(() => {
								console.log('Finished waiting');
								order.push(2);
								resolve();
							}, 250);
						});
					},
					notes: 2,
				}),
				sut.throttle({
					...options,
					onLocked: () => {
						console.log('onLocked', 3);
						order.push(3);
					},
					onUnlocked: () => {
						console.log('onUnlocked', 3);
						return new Promise((resolve, reject) => {
							setTimeout(() => {
								console.log('Finished waiting');
								order.push(3);
								resolve();
							}, 250);
						});
					},
					notes: 3,
				}),
				sut.throttle({
					...options,
					onLocked: () => {
						console.log('onLocked', 4);
						order.push(4);
					},
					onUnlocked: () => {
						console.log('onUnlocked', 4);
						return new Promise((resolve, reject) => {
							setTimeout(() => {
								console.log('Finished waiting');
								order.push(4);
								resolve();
							}, 250);
						});
					},
					notes: 4,
				}),
				sut.throttle({
					...options,
					onLocked: () => {
						console.log('onLocked', 5);
						order.push(5);
					},
					onUnlocked: () => {
						console.log('onUnlocked', 5);
						return new Promise((resolve, reject) => {
							setTimeout(() => {
								console.log('Finished waiting');
								order.push(5);
								resolve();
							}, 250);
						});
					},
					notes: 5,
				}),
			]))
			// This would be FIFO.
			// 1,2 are executed when 3 and then 4 arrive
			// 3,4 are left waiting
			//.then(() => expect(order).to.have.ordered.members([1,2]));
			// FILO.
			// 3,4 are executed as they arrive
			// 1,2 are left waiting until 
			// 0 returns after some delay
			// 5 is the last time, 2 and 1 remain to be processed
			.then(() => expect(order).to.have.ordered.members([3, 4, 0, 5, 2, 1]));
	}).timeout(15000);

});
