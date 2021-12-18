(function (global) {
	// 定义状态常量
	PENDING = 'pending';
	FULFILLED = 'fulfilled';
	REJECTED = 'rejected';

	class Promise {
		constructor(excutor) {
			const _this = this;
			_this.data = null;
			_this.status = PENDING;
			_this.callbacks = [];

			/**
			 * 处理成功 => 需要改变状态，如果有回调函数，执行性回调函数
			 * @param {any} value 成功的返回值
			 * @returns
			 */
			function resolve(value) {
				if (_this.status !== PENDING) return;
				_this.status = FULFILLED;
				_this.data = value;

				if (_this.callbacks.length) {
					// 注册任务列队，回调是不需要理解执行，需要等待状态的改变才能执行
					setTimeout(() => {
						_this.callbacks.forEach(({ onResolved }) => onResolved(value));
					});
				}
			}

			/**
			 * 处理拒绝 => 需要改变状态，如果有回调函数，执行性回调函数
			 * @param {string} reason 失败的原因
			 */
			function reject(reason) {
				if (_this.status !== PENDING) return;
				_this.status = REJECTED;
				_this.data = reason;

				if (_this.callbacks.length) {
					// 注册任务列队，回调是不需要理解执行，需要等待状态的改变才能执行
					setTimeout(() => {
						_this.callbacks.forEach(({ onRejected }) => onRejected(reason));
					});
				}
			}

			// 首先执行一个执行器，同步代码，注意这里需要捕获异常
			try {
				excutor(resolve, reject);
			} catch (err) {
				reject(err);
			}
		}

		/**
		 * 静态 resolve 方法
		 * @param {any} value 可能是普通值，也可能是一个promise实例
		 */
		static resolve = function (value) {
			return new Promise((resolve, reject) => {
				if (value instanceof Promise) {
					value.then(resolve, reject);
				} else {
					resolve(value);
				}
			});
		};

		/**
		 * 静态 reject 方法
		 * @param {any} reason 可能是普通值，也可能是一个promise实例
		 */
		static reject = function (reason) {
			return new Promise((resolve, reject) => {
				reject(reason);
			});
		};

		/**
		 * 方法用于将多个 Promise 实例，包装成一个新的 Promise 实例。
		 * @param {Array<Promise | normal>} promises 一个由promise，或者非promise组成的数组
		 * @returns
		 */
		static all = function (promises) {
			const _tempArr = [];
			return new Promise((resolve, reject) => {
				promises.forEach((item, i) => {
					Promise.resolve(item).then(
						value => {
							_tempArr[i] = value;
							if (_tempArr.length === promises.length) {
								resolve(_tempArr);
							}
						},
						reason => reject(reason),
					);
				});
			});
		};

		static race = function (promises) {
			return new Promise((resolve, reject) => {
				promises.forEach((item, i) => {
					Promise.resolve(item).then(resolve, reject);
				});
			});
		};

		/**
		 * 处理then方法，支持链式调用，那么就要返回一个promise实例
		 * 注意成功，或者失败的回调函数都需要处理，因为有可能未定义，比如
		 * @param {function} onResolved 成功的回调函数
		 * @param {function} onRejected 失败的回调函数
		 */
		then(onResolved, onRejected) {
			// 处理回调函数
			onResolved =
				typeof onResolved === 'function' ? onResolved : value => value;
			onRejected =
				typeof onRejected === 'function'
					? onRejected
					: reason => {
							throw reason;
					  };

			const _this = this;
			return new Promise((resolve, reject) => {
				// 定义一个处理函数
				const handle = callback => {
					try {
						const result = callback(_this.data);
						if (result instanceof Promise) {
							result.then(resolve, reject);
						} else {
							resolve(result);
						}
					} catch (err) {
						reject(err);
					}
				};

				// 回调函数是先指定，如在调用的时候执行了定时器
				// 此时需要将回调函数存起来
				if (_this.status === PENDING) {
					_this.callbacks.push({
						onResolved() {
							handle(onResolved);
						},
						onRejected() {
							handle(onRejected);
						},
					});
				}

				if (_this.status === FULFILLED) {
					setTimeout(() => handle(onResolved));
				}

				if (_this.status === REJECTED) {
					setTimeout(() => handle(onRejected));
				}
			});
		}

		catch(onRejected) {
			return this.then(null, onRejected);
		}
	}

	global.Promise = Promise;
})(window);
