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
			onUnlocked: (done) => {
				console.log('onUnlocked');
				done();
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
			onUnlocked: (done) => {
				console.log('onUnlocked', _.isFunction(done));
				setTimeout(() => done(), 500);
			},
		};
		chai.spy.on(options, 'onLocked');

		return Promise.resolve()
			.then(() => {sut.throttle(options)}) // Don't return and wait for this promise.
			.then(() => sut.throttle(options))
			.then(() => expect(options.onLocked).to.have.been.called());
	});

	it('should fire onLocked in FILO order', ()=> {
		sut.settings.leading = false;
		sut.settings.queue = 3;

		var options = {
			id: 'test',
			hash: ({test: 'should fire onLocked in FILO order'}),
			onUnlocked: (done) => {
				console.log('onUnlocked', _.isFunction(done));
				setTimeout(() => done(), 500);
			},
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
			})}) // Don't return and wait for this promise.
			// Subsequent attempts are queued
			.then(() => {sut.throttle({
				...options,
				onLocked: () => {
					console.log('onLocked', 1);
					order.push(1);
				},
			})}) // Don't return and wait for this promise.
			.then(() => {sut.throttle({
				...options,
				onLocked: () => {
					console.log('onLocked', 2);
					order.push(2);
				},
			})}) // Don't return and wait for this promise.
			// When the queue length is reached onLocked is executed.
			.then(() => {sut.throttle({
				...options,
				onLocked: () => {
					console.log('onLocked', 3);
					order.push(3);
				},
			})}) // Don't return and wait for this promise.
			.then(() => {sut.throttle({
				...options,
				onLocked: () => {
					console.log('onLocked', 4);
					order.push(4);
				},
			})}) // Don't return and wait for this promise.
			.then(() => sut.throttle(options))
			// TODO: What does this mean? 1 and 2 are never executed?
			.then(() => expect(order).to.have.ordered.members([3,4]));
	});

});
