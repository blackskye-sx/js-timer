/**
 * A module for creating clocks. The core module is simply a constructor that
 * provides a method of receiving a notification roughly every second.
 * @module clock
 */

(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define([], factory);
	} else if (typeof module === 'object' && module.exports) {
		// Node. Does not work with strict CommonJS, but
		// only CommonJS-like environments that support module.exports,
		// like Node.
		module.exports = factory();
	} else {
		// Browser globals (root is window)
		root.Clock = factory();
	}
}(this, function () {

/**
 * Very basic clock object that receives tick notifications ever second.
 * Override ontick to receive the notification.
 * @constructor
 * @alias module:clock
 */
function Clock() {
	this.timeout = false;
}

Clock.prototype = {
	/**
	 * Start the clock. {@link module:clock#ontick ontick()} will be invoked
	 * nearly immediately with the current time and then invoked every second.
	 */
	start: function() {
		if (this.timeout === false) {
			// I suppose lastTime could also be set to 0 on the assumption that no one
			// is going to be running with a clock set to 1970 Jan 1, but... whatever.
			// Go ahead and support weird time travelers.
			var me = this, lastTime = new Date().getTime() - 1000;
			me.timeout = 1;
			function tick() {
				var now = new Date();
				// Round now up, as the timeout may be called slightly early.
				var t = now.getTime() + 500;
				// And chop off the uneven milliseconds - useful for countdown
				// timers.
				t -= t % 1000;
				now.setTime(t);
				if (t < lastTime) {
					// Clock has run backwards.
					me.onbackwards(now);
				}
				lastTime = t;
				me.ontick(now);
				var next = 1000 - (new Date().getTime() % 1000);
				if (next < 50) {
					// If it's really close, just jump to the next second, as we'll
					// have "rounded" to this second anyway.
					next += 1000;
				}
				// We need to check if we're still going, as stop() may have
				// stopped the timeout.
				if (me.timeout !== false)
					me.timeout = setTimeout(tick, next);
			}
			tick();
		}
	},
	/**
	 * Stops the clock. No further {@link module:clock#ontick ontick()}s will
	 * be called until the clock is restarted using
	 * {@linkcode module:clock#start start()}.
	 */
	stop: function() {
		if (this.timeout !== false) {
			clearTimeout(this.timeout);
			this.timeout = false;
		}
	},
	/**
	 * Called once a second with the current time.
	 *
	 * Note that the `Date` object given is the time that the clock is being
	 * "ticked" for, and is **not** going to be the exact same time that
	 * `new Date()` would generate. This is because JavaScript engines may call a
	 * callback set by `setTimeout()` or `setInterval()` slightly early or
	 * slightly late. This class deals with that by rounding to the nearest
	 * second and then passing that rounded time to this function.
	 *
	 * The default implementation does nothing.
	 *
	 * @param date {Date} the current time.
	 */
	ontick: function(date) {
	},
	/**
	 * Generally speaking it can be assumed that ticks will only ever increase the
	 * current time. This does not need to be true: it is possible for the clock
	 * to run "backwards." The most likely cause is the clock being fast and the
	 * user correcting it or the clock be synced to an NTP server.
	 *
	 * Changing over to Daylight Saving Time will **not** trigger this callback,
	 * it's only used when an {@link module:clock#ontick ontick()} would have
	 * triggered for an earlier time than a previous one.
	 *
	 * Not all clocks need to handle this case, however some clocks may be written
	 * in such a way that elements that happened "in the past" are removed and may
	 * suddenly be required again.
	 *
	 * The default implementation does nothing.
	 *
	 * @param date {Date} the current time, as would have been passed to
	 *   {@code ontick}.
	 */
	onbackwards: function(date) {
	}
};

/**
 * Utility function to 0-pad a two-digit number, since this comes up so often.
 */
Clock.zeropad = function(d) {
	return d < 10 ? '0' + d : d.toString();
}

/**
 * Returns an interval between two dates.
 *
 * @param {Date} firstDate the first date
 * @param {Date} secondDate the second date
 * @return {Timer.Interval} interval between the two.
 */
Clock.difference = function(firstDate, secondDate) {
	if (firstDate instanceof Date)
		firstDate = firstDate.getTime();
	if (secondDate instanceof Date)
		secondDate = secondDate.getTime();
	return new Timer.Interval(firstDate - secondDate);
}

/**
 * An interval of time - sort of like a `Date()` but for different
 * periods of time. Given a number of milliseconds, this calculates the number
 * of weeks, days, hours, minutes, and seconds between the two. Useful for
 * creating a countdown to a given time.
 * @constructor
 * @param {Number} interval
 *         the initial interval in milliseconds
 */
Clock.Interval = function(interval) {
	// Step 0: Deal with negative intervals. Intervals only make sense using
	// positive numbers, but include a flag if it's in the past.
	/**
	 * Indicates that the interval occurred in the past.
	 */
	this.isInPast = interval < 0;
	// And make it absolute.
	interval = Math.abs(interval);
	// Step 1: convert to seconds.
	var t = Math.floor(interval / 1000); // 1000 ms = 1 seconds

	/**
	 * The number of milliseconds in the interval. For a 1500ms interval, this
	 * is 500. This is almost never useful but is included anyway.
	 */
	this.millis = (interval - (t * 1000));
	/**
	 * The number of seconds in the interval. For a 90 second interval, this is
	 * 30.
	 */
	this.seconds = t % 60; // 60 seconds = 1 minute
	t = Math.floor(t / 60);
	/**
	 * The number of minutes in the interval. For a 90 minute interval, this is
	 * 30.
	 */
	this.minutes = t % 60; // 60 minutes = 1 hour
	t = Math.floor(t / 60);
	/**
	 * The number of hours in the interval. For a 1.5 day interval, this is 12.
	 */
	this.hours = t % 24; // 24 hours = 1 day
	t = Math.floor(t / 24);
	/**
	 * The number of days in the interval. For a 10 day interval, this is 3 and
	 * {@linkcode module:timer.Interval#weeks weeks} will be 1.
	 */
	this.days = t % 7; // 7 days = 1 week
	/**
	 * The number of weeks in the interval. There are no larger spans of time
	 * calculated at present. Months make no sense at this level: how long is a
	 * month? 28 days? Depends on when the interval starts? Years may be added
	 * in the future, but years have a similar problem: How long is a year?
	 * 365 days? What about leap years?
	 */
	this.weeks = Math.floor(t / 7); // And enough
};

Clock.Interval.prototype.toString = function() {
	return '[' + this.weeks + ' weeks ' + this.days + ' days ' + this.hours +
		' hours ' + this.minutes + ' minutes ' + this.seconds + ' seconds]';
}

return Clock;
}));