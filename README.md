@MomsFriendlyDevCo/throttle
=======================
Async throttling mechanism based on MongoDB locking.

```javascript
var Throttle = require('@momsfriendlydevco/throttle');

var throttler = new Throttle();
throttler.init()
	.then(()=> throttler.throttle(() => {
			// Worker is complete when promise resolves
			return Promise.resolve();
		},
		{
			id: 'foo',
			hash: ({foo: 'bar'}),
		}
	))
	.catch(e => {
		// The queue full of workers already in progress.
	});
```


API
===

Throttle(settings)
--------------
Main constructor.
Requires instance.init() to be called before the instance is functional.


Throttle.defaults
-------------
Default settings.

| Setting              | Type     | Default                            | Description                                     |
|----------------------|----------|------------------------------------|-------------------------------------------------|
| `leading`             | `boolean` | `true`                             | Bypasses use of the queue |
| `queue`             | `number` | 1                             | Number of items for which to keep queued callbacks |
| `lock`            | `object` | See below                          | Lock package configuration options                      |
| `lock.expiry`             | `number` | 1 hour                             | The time in milliseconds until the lock expires |
| `lock.ttl`             | `number` | 1 min                             | The time in milliseconds until keep-alive expires |
| `lock.mongodb`            | `object` | See below                          | MongoDB connection options                      |
| `lock.mongodb.uri`        | `string` | `"mongodb://localhost/mfdc-cache"` | The MongoDB URI to connect to                   |
| `lock.mongodb.collection` | `string` | `"locks"`                          | The name of the collection to use               |
| `lock.mongodb.options`    | `object` | See code                           | Additional connection options to use            |
| `lock.omitFields`         | `array`  | `['_id', '__v']`                   | Which fields to autmatically skip when using `get()` |
| `lock.includeKeys`        | `boolean` | `true`                            | Also save the key field values, reduces overhead to disable this |


throttler.init(settings)
-------------------
Check all settings and connect to the database.


throttler.throttle(worker, options)
----------------------------------
Callback `worker` will be called immediately if a lock is available or otherwise throttled in a queue. When queue is full promise will be rejected with error `"Throttle queue is full"`.

| Option              | Type     | Default                            | Description                                     |
|----------------------|----------|------------------------------------|-------------------------------------------------|
| `id`             | `mixed` | undefined                             | Key within lock collection |
| `hash`             | `string` | undefined                             | An object which uniquely identies the object being locked |
