var _ = require('lodash');
var chai = require('chai')
var spies = require('chai-spies');
var chaiAsPromised = require("chai-as-promised");
var mlog = require('mocha-logger');

chai.use(spies);
chai.use(chaiAsPromised);
var expect = chai.expect;

var Sut = require('..');
const Lock = require('@momsfriendlydevco/lock');

describe('@momsfriendlydevco/throttle', ()=> {
	var sut;
	before('set up the module', ()=> sut = new Sut());
	before('initalize', ()=> sut.init().then(() => sut.lock.clear()));
	after('destroy', ()=> sut.destroy());

	it('should fire onUnlocked when available', ()=> {
		//sut.settings.leading = false;
		//sut.settings.queue = 0;

		var options = {
			id: 'test',
			hash: ({test: 'should fire onUnlocked when available'}),
		};

		var promise = sut.throttle(() => Promise.resolve(), options);
		expect(promise).to.be.eventually.fulfilled;
		return promise;
	});

	it('should fire onLocked when already requested', ()=> {
		//sut.settings.leading = false;
		//sut.settings.queue = 0;

		var options = {
			id: 'test',
			hash: ({test: 'should fire onLocked when already requested'}),
		};

		var promises = [
			sut.throttle(() => {
				mlog.log('onUnlocked', 0);
				return new Promise((resolve, reject) => {
					setTimeout(() => {
						mlog.log('Finished waiting', 0);
						resolve();
					}, 250);
				});
			}, {...options, notes: 0}),
			sut.throttle(() => Promise.resolve(), {...options, notes: 1}),
		];
		expect(promises[0]).to.be.eventually.fulfilled;
		expect(promises[1]).to.be.eventually.rejected;

		return Promise.all(promises).catch(()=>{});
	});

	it('should fire callbacks in FILO order', ()=> {
		sut.settings.leading = false;
		sut.settings.queue = 3;

		var options = {
			id: 'test',
			hash: ({test: 'should fire callbacks in FILO order'}),
		};

		var order = [];

		return Promise.resolve()
			// This first attempt creates a lock
			.then(() => {
				sut.throttle(() => {
					mlog.log('onUnlocked', 0);
					return new Promise((resolve, reject) => {
						setTimeout(() => {
							mlog.log('Finished waiting');
							order.push(0);
							resolve();
						}, 250);
					});
				}, {
					...options,
					notes: 0,
				}).catch(() => {
					mlog.log('onLocked', 0);
					order.push(0);
				});
			}) // Don't return and wait for this promise.
			// Subsequent attempts are queued
			.then(() => Promise.all([
				sut.throttle(() => {
						mlog.log('onUnlocked', 1);
						return new Promise((resolve, reject) => {
							setTimeout(() => {
								mlog.log('Finished waiting');
								order.push(1);
								resolve();
							}, 250);
						});
					}, {
						...options,
						notes: 1,
					})
					.catch(() => {
						mlog.log('onLocked', 1);
						order.push(1);
					}),
				sut.throttle(() => {
						mlog.log('onUnlocked', 2);
						return new Promise((resolve, reject) => {
							setTimeout(() => {
								mlog.log('Finished waiting');
								order.push(2);
								resolve();
							}, 250);
						});
					}, {
						...options,
						notes: 2,
					})
					.catch(() => {
						mlog.log('onLocked', 2);
						order.push(2);
					}),
				sut.throttle(() => {
						mlog.log('onUnlocked', 3);
						return new Promise((resolve, reject) => {
							setTimeout(() => {
								mlog.log('Finished waiting');
								order.push(3);
								resolve();
							}, 250);
						});
					}, {
						...options,
						notes: 3,
					})
					.catch(() => {
						mlog.log('onLocked', 3);
						order.push(3);
					}),
				sut.throttle(() => {
						mlog.log('onUnlocked', 4);
						return new Promise((resolve, reject) => {
							setTimeout(() => {
								mlog.log('Finished waiting');
								order.push(4);
								resolve();
							}, 250);
						});
					}, {
						...options,
						notes: 4,
					})
					.catch(() => {
						mlog.log('onLocked', 4);
						order.push(4);
					}),
				sut.throttle(() => {
						mlog.log('onUnlocked', 5);
						return new Promise((resolve, reject) => {
							setTimeout(() => {
								mlog.log('Finished waiting');
								order.push(5);
								resolve();
							}, 250);
						});
					}, {
						...options,
						notes: 5,
					})
					.catch(() => {
						mlog.log('onLocked', 5);
						order.push(5);
					}),
			]))
			// FILO. (With a queue length of 3).
			// 3,4 are executed (dropped via onLocked) as they arrive
			// 1,2 are left waiting until...
			// 0 returns after some delay (when onUnlocked promise resolves)
			// 5 is the last call, 2 and 1 remain to be processed (onUnlocked fired on each as the queue clears)
			.then(() => expect(order).to.have.ordered.members([3, 4, 0, 5, 2, 1]));
	}).timeout(5000);

	it('should support passing in existing Lock instance', ()=> {
		sut = new Sut({
			lock: new Lock()
		});
		expect(sut.settings.lock).to.be.an.instanceof(Lock);
	});

});
