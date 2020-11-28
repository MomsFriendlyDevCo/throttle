var _ = require('lodash');
var chai = require('chai')
var spies = require('chai-spies');
var chaiAsPromised = require("chai-as-promised");
var mlog = require('mocha-logger');

chai.use(spies);
chai.use(chaiAsPromised);
var expect = chai.expect;

var Sut = require('..');
const { resolve } = require('path');

describe('@momsfriendlydevco/throttle', ()=> {
	var sut;
	before('set up the module', ()=> sut = new Sut());
	before('initalize', ()=> sut.init().then(() => sut.lock.clear()));
	after('destroy', ()=> sut.destroy());

	xit('should fire onUnlocked when available', ()=> {
		//sut.settings.leading = false;
		//sut.settings.queue = 0;

		var options = {
			id: 'test',
			hash: ({test: 'should fire onUnlocked when available'}),
		};

		var promise = sut.throttle(options);
		expect(promise).to.be.eventually.fulfilled;
	});

	xit('should fire onLocked when already requested', ()=> {
		//sut.settings.leading = false;
		//sut.settings.queue = 0;

		var options = {
			id: 'test',
			hash: ({test: 'should fire onLocked when already requested'}),
		};

		var promises = [
			sut.throttle({...options, notes: 0}),
			sut.throttle({...options, notes: 1}),
		];
		expect(promises[0]).to.be.eventually.fulfilled;
		expect(promises[1]).to.be.eventually.rejected;

		return Promise.all(promises);
	});

	it('should fire callbacks in FILO order', ()=> {
		sut.settings.leading = false;
		sut.settings.queue = 3;

		var options = {
			id: 'test',
			hash: ({test: 'should fire callbacks in FILO order'}),
		};

		var order = [];

		/*
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
			// FILO. (With a queue length of 3).
			// 3,4 are executed (dropped via onLocked) as they arrive
			// 1,2 are left waiting until...
			// 0 returns after some delay (when onUnlocked promise resolves)
			// 5 is the last call, 2 and 1 remain to be processed (onUnlocked fired on each as the queue clears)
			.then(() => expect(order).to.have.ordered.members([3, 4, 0, 5, 2, 1]));
			*/

		/*
		var promises = [];

		for (var x=0; x<5; x++) {
			promises.push(
				sut.throttle({...options, notes: x})
					.then(() => {
						console.log('onUnlocked', x);
						return new Promise((resolve, reject) => {
							setTimeout(() => {
								console.log('Finished waiting', x);
								order.push(x);
								resolve();
							}, 250);
						});
					})
					.catch(() => {
						console.log('onLocked', x);
						order.push(x);
					})
			);
		}
		*/


		return Promise.resolve()
			// This first attempt creates a lock
			.then(() => {
				sut.throttle({
					...options,
					notes: 0,
				})
				.then(() => {
					console.log('onUnlocked', 0);
					return new Promise((resolve, reject) => {
						setTimeout(() => {
							console.log('Finished waiting', 0);
							order.push(0);
							resolve();
						}, 250);
					});
				})
				.catch(() => {
					console.log('onLocked', 0);
					order.push(0);
				})
			}) // Don't return and wait for this promise.
			// Subsequent attempts are queued
			.then(() => Promise.all([
				sut.throttle({
					...options,
					notes: 1,
				})
				.then(() => {
					console.log('onUnlocked', 1);
					return new Promise((resolve, reject) => {
						setTimeout(() => {
							console.log('Finished waiting', 1);
							order.push(1);
							resolve();
						}, 250);
					});
				})
				.catch(() => {
					console.log('onLocked', 1);
					order.push(1);
				}),
				sut.throttle({
					...options,
					notes: 2,
				})
				.then(() => {
					console.log('onUnlocked', 2);
					return new Promise((resolve, reject) => {
						setTimeout(() => {
							console.log('Finished waiting', 2);
							order.push(2);
							resolve();
						}, 250);
					});
				})
				.catch(() => {
					console.log('onLocked', 2);
					order.push(2);
				}),
				sut.throttle({
					...options,
					notes: 3,
				}).then(() => {
					console.log('onUnlocked', 3);
					return new Promise((resolve, reject) => {
						setTimeout(() => {
							console.log('Finished waiting', 3);
							order.push(3);
							resolve();
						}, 250);
					});
				})
				.catch(() => {
					console.log('onLocked', 3);
					order.push(3);
				}),
				sut.throttle({
					...options,
					notes: 4,
				}).then(() => {
					console.log('onUnlocked', 4);
					return new Promise((resolve, reject) => {
						setTimeout(() => {
							console.log('Finished waiting', 4);
							order.push(4);
							resolve();
						}, 250);
					});
				})
				.catch(() => {
					console.log('onLocked', 4);
					order.push(4);
				}),
				sut.throttle({
					...options,
					notes: 5,
				}).then(() => {
					console.log('onUnlocked', 5);
					return new Promise((resolve, reject) => {
						setTimeout(() => {
							console.log('Finished waiting', 5);
							order.push(5);
							resolve();
						}, 250);
					});
				})
				.catch(() => {
					console.log('onLocked', 5);
					order.push(5);
				}),
			]))
			.then(() => expect(order).to.have.ordered.members([3, 4, 0, 5, 2, 1]));

			
		//expect(promises[0]).to.be.eventually.fulfilled;
		//expect(promises[1]).to.be.eventually.rejected;

		return promises[0]
			.then(() => Promise.all(promises))
			.then(() => expect(order).to.have.ordered.members([3, 4, 0, 5, 2, 1]));
	}).timeout(15000);

});
