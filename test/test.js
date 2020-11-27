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

});
