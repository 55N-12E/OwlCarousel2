/**
 * Owl carousel
 * @version 2.0.0
 * @author Bartosz Wojciechowski
 * @license The MIT License (MIT)
 * @todo Lazy Load Icon
 * @todo prevent animationend bubling
 * @todo itemsScaleUp
 * @todo Test Zepto
 * @todo stagePadding calculate wrong active classes
 */
;(function($, window, document, undefined) {

	var item, dom, width, num, pos, drag, speed, state, e;

	/**
	 * Template for the data of each item respectively its DOM element.
	 * @private
	 */
	item = {
		index: false,
		indexAbs: false,
		posLeft: false,
		clone: false,
		active: false,
		loaded: false,
		lazyLoad: false,
		current: false,
		width: false,
		center: false,
		page: false,
		hasVideo: false,
		playVideo: false
	};

	/**
	 * Template for the references to DOM elements, those with `$` sign are `jQuery` objects.
	 * @private
	 */
	dom = {
		el: null, // main element
		$el: null, // jQuery main element
		stage: null, // stage
		$stage: null, // jQuery stage
		oStage: null, // outer stage
		$oStage: null, // $ outer stage
		$items: null, // all items, clones and originals included
		$oItems: null, // original items
		$cItems: null, // cloned items only
		$content: null
	};

	/**
	 * Template for the widths of some elements.
	 * @private
	 */
	width = {
		el: 0,
		stage: 0,
		item: 0,
		prevWindow: 0,
		cloneLast: 0
	};

	/**
	 * Template for counting to some properties.
	 * @private
	 */
	num = {
		items: 0,
		oItems: 0,
		cItems: 0,
		active: 0,
		merged: []
	};

	/**
	 * Template for status information about drag and touch events.
	 * @private
	 */
	drag = {
		start: 0,
		startX: 0,
		startY: 0,
		current: 0,
		currentX: 0,
		currentY: 0,
		offsetX: 0,
		offsetY: 0,
		distance: null,
		startTime: 0,
		endTime: 0,
		updatedX: 0,
		targetEl: null
	};

	/**
	 * Template for some status informations.
	 * @private
	 */
	state = {
		isTouch: false,
		isScrolling: false,
		isSwiping: false,
		direction: false,
		inMotion: false
	};

	/**
	 * Event functions references.
	 * @private
	 */
	e = {
		_onDragStart: null,
		_onDragMove: null,
		_onDragEnd: null,
		_transitionEnd: null,
		_resizer: null,
		_responsiveCall: null,
		_goToLoop: null,
		_checkVisibile: null
	};

	/**
	 * Creates a carousel.
	 * @class The Owl Carousel.
	 * @public
	 * @param {HTMLElement|jQuery} element - The element to create the carousel for.
	 * @param {Object} [options] - The options
	 */
	function Owl(element, options) {

		// add basic Owl information to dom element
		element.owlCarousel = {
			'name': 'Owl Carousel',
			'author': 'Bartosz Wojciechowski',
			'version': '2.0.0-beta.2.1'
		};

		/**
		 * Current settings for the carousel.
		 * @protected
		 */
		this.settings = null;

		/**
		 *
		 * @protected
		 * @todo Must be dosumented.
		 */
		this.options = $.extend({}, Owl.Defaults, options);

		/**
		 * Template for the data of each item.
		 * @protected
		 */
		this.itemData = $.extend({}, item);

		/**
		 * Contains references to DOM elements, those with `$` sign are `jQuery` objects.
		 * @protected
		 */
		this.dom = $.extend({}, dom);

		/**
		 * Caches the widths of some elements.
		 * @protected
		 */
		this.width = $.extend({}, width);

		/**
		 * Caches some count informations.
		 * @protected
		 */
		this.num = $.extend({}, num);

		/**
		 * Caches informations about drag and touch events.
		 */
		this.drag = $.extend({}, drag);

		/**
		 * Caches some status informations.
		 * @protected
		 */
		this.state = $.extend({}, state);

		/**
		 * @protected
		 * @todo Must be documented
		 */
		this.e = $.extend({}, e);

		/**
		 * References to the running plugins of this carousel.
		 * @protected
		 */
		this.plugins = {};

		/**
		 * Currently suppressed events to prevent them from beeing retriggered.
		 * @protected
		 */
		this._supress = {};

		/**
		 * The absolute current position.
		 * @protected
		 */
		this._current = null;

		/**
		 * The animation speed in milliseconds.
		 * @protected
		 */
		this._speed = null;

		/**
		 * The coordinates of all items in pixel.
		 */
		this._coordinates = null;

		this.dom.el = element;
		this.dom.$el = $(element);

		for (var plugin in Owl.Plugins) {
			this.plugins[plugin[0].toLowerCase() + plugin.slice(1)]
				= new Owl.Plugins[plugin](this);
		}

		this.init();
	}

	/**
	 * Default options for the carousel.
	 * @public
	 */
	Owl.Defaults = {
		items: 3,
		loop: false,
		center: false,

		mouseDrag: true,
		touchDrag: true,
		pullDrag: true,
		freeDrag: false,

		margin: 0,
		stagePadding: 0,

		merge: false,
		mergeFit: true,
		autoWidth: false,

		startPosition: 0,

		smartSpeed: 250,
		fluidSpeed: false,
		dragEndSpeed: false,

		responsive: {},
		responsiveRefreshRate: 200,
		responsiveBaseElement: window,
		responsiveClass: false,

		fallbackEasing: 'swing',

		info: false,

		nestedItemSelector: false,
		itemElement: 'div',
		stageElement: 'div',

		// Classes and Names
		themeClass: 'owl-theme',
		baseClass: 'owl-carousel',
		itemClass: 'owl-item',
		centerClass: 'center',
		activeClass: 'active'
	};

	/**
	 * Contains all registered plugins.
	 * @public
	 */
	Owl.Plugins = {};

	/**
	 * Initializes the carousel.
	 * @protected
	 */
	Owl.prototype.init = function() {

		// Update options.items on given size
		this.setResponsiveOptions();

		this.trigger('initialize');

		// Add base class
		if (!this.dom.$el.hasClass(this.settings.baseClass)) {
			this.dom.$el.addClass(this.settings.baseClass);
		}

		// Add theme class
		if (!this.dom.$el.hasClass(this.settings.themeClass)) {
			this.dom.$el.addClass(this.settings.themeClass);
		}

		// Add theme class
		if (this.settings.rtl) {
			this.dom.$el.addClass('owl-rtl');
		}

		// Check support
		this.browserSupport();

		if (this.settings.autoWidth && this.state.imagesLoaded !== true) {
			var imgs, nestedSelector, width;
			imgs = this.dom.$el.find('img');
			nestedSelector = this.settings.nestedItemSelector ? '.' + this.settings.nestedItemSelector : undefined;
			width = this.dom.$el.children(nestedSelector).width();

			if (imgs.length && width <= 0) {
				this.preloadAutoWidthImages(imgs);
				return false;
			}
		}

		// Get and store window width
		// iOS safari likes to trigger unnecessary resize event
		this.width.prevWindow = this.viewport();

		// create stage object
		this.createStage();

		// Append local content
		this.fetchContent();

		// attach generic events
		this.eventsCall();

		// attach generic events
		this.internalEvents();

		this.dom.$el.addClass('owl-loading');
		this.refresh(true);
		this.dom.$el.removeClass('owl-loading').addClass('owl-loaded');

		this.trigger('initialized');

		// attach custom control events
		this.addTriggerableEvents();
	};

	/**
	 * Sets responsive options.
	 * @protected
	 */
	Owl.prototype.setResponsiveOptions = function() {
		if (!this.options.responsive) {
			this.settings = $.extend({}, this.options);
		} else {
			var viewport = this.viewport(),
				overwrites = this.options.responsive,
				match = -1;

			$.each(overwrites, function(breakpoint) {
				if (breakpoint <= viewport && breakpoint > match) {
					match = Number(breakpoint);
				}
			});

			this.settings = $.extend({}, this.options, overwrites[match]);
			delete this.settings.responsive;

			// Responsive Class
			if (this.settings.responsiveClass) {
				this.dom.$el.attr('class', function(i, c) {
					return c.replace(/\b owl-responsive-\S+/g, '');
				}).addClass('owl-responsive-' + match);
			}
		}
	};

	/**
	 * Updates option logic if necessery.
	 * @protected
	 */
	Owl.prototype.optionsLogic = function() {
		// Toggle Center class
		this.dom.$el.toggleClass('owl-center', this.settings.center);

		// if items number is less than in body
		if (this.settings.loop && this.num.oItems < this.settings.items) {
			this.settings.loop = false;
		}

		if (this.settings.autoWidth) {
			this.settings.stagePadding = false;
			this.settings.merge = false;
		}
	};

	/**
	 * Creates stage and outer-stage elements.
	 * @protected
	 */
	Owl.prototype.createStage = function() {
		var oStage = document.createElement('div'),
			stage = document.createElement(this.settings.stageElement);

		oStage.className = 'owl-stage-outer';
		stage.className = 'owl-stage';

		oStage.appendChild(stage);
		this.dom.el.appendChild(oStage);

		this.dom.oStage = oStage;
		this.dom.$oStage = $(oStage);
		this.dom.stage = stage;
		this.dom.$stage = $(stage);

		oStage = null;
		stage = null;
	};

	/**
	 * Creates an item container.
	 * @protected
	 * @returns {jQuery} - The item container.
	 */
	Owl.prototype.createItemContainer = function() {
		var item = document.createElement(this.settings.itemElement);
		item.className = this.settings.itemClass;
		return $(item);
	};

	/**
	 * Fetches the content.
	 * @protected
	 */
	Owl.prototype.fetchContent = function(extContent) {
		if (extContent) {
			this.dom.$content = (extContent instanceof jQuery) ? extContent : $(extContent);
		} else if (this.settings.nestedItemSelector) {
			this.dom.$content = this.dom.$el.find('.' + this.settings.nestedItemSelector).not('.owl-stage-outer');
		} else {
			this.dom.$content = this.dom.$el.children().not('.owl-stage-outer');
		}
		// content length
		this.num.oItems = this.dom.$content.length;

		// init Structure
		if (this.num.oItems !== 0) {
			this.initStructure();
		}
	};

	/**
	 * Initializes the content struture.
	 * @protected
	 */
	Owl.prototype.initStructure = function() {
		this.createNormalStructure();
	};

	/**
	 * Creates small/mid weight content structure.
	 * @protected
	 * @todo This results in a poor performance,
	 * but this is due to the approach of completely
	 * rebuild the existing DOM tree from scratch,
	 * rather to use them. The effort to implement
	 * this with a good performance, while maintaining
	 * the original approach is disproportionate.
	 */
	Owl.prototype.createNormalStructure = function() {
		var i, $item;
		for (i = 0; i < this.num.oItems; i++) {
			$item = this.createItemContainer();
			this.initializeItemContainer($item, this.dom.$content[i]);
			this.dom.$stage.append($item);
		}
		this.dom.$content = null;
	};

	/**
	 * Creates custom content structure.
	 * @protected
	 */
	Owl.prototype.createCustomStructure = function(howManyItems) {
		var i, $item;
		for (i = 0; i < howManyItems; i++) {
			$item = this.createItemContainer();
			this.createItemContainerData($item);
			this.dom.$stage.append($item);
		}
	};

	/**
	 * Initializes item container with provided content.
	 * @protected
	 * @param {jQuery} item - The item that has to be filled.
	 * @param {HTMLElement|jQuery|string} content - The content that fills the item.
	 */
	Owl.prototype.initializeItemContainer = function(item, content) {
		this.trigger('change', { property: { name: 'item', value: item } });

		this.createItemContainerData(item);
		item.append(content);

		this.trigger('changed', { property: { name: 'item', value: item } });
	};

	/**
	 * Creates item container data.
	 * @protected
	 * @param {jQuery} item - The item for which the data are to be set.
	 * @param {jQuery} [source] - The item whose data are to be copied.
	 */
	Owl.prototype.createItemContainerData = function(item, source) {
		var data = $.extend({}, this.itemData);

		if (source) {
			$.extend(data, source.data('owl-item'));
		}

		item.data('owl-item', data);
	};

	/**
	 * Clones an item container.
	 * @protected
	 * @param {jQuery} item - The item to clone.
	 * @returns {jQuery} - The cloned item.
	 */
	Owl.prototype.cloneItemContainer = function(item) {
		var $clone = item.clone(true, true).addClass('cloned');
		// somehow data references the same object
		this.createItemContainerData($clone, $clone);
		$clone.data('owl-item').clone = true;
		return $clone;
	};

	/**
	 * Updates original items index data.
	 * @protected
	 */
	Owl.prototype.updateLocalContent = function() {

		var k, item;

		this.dom.$oItems = this.dom.$stage.find('.' + this.settings.itemClass).filter(function() {
			return $(this).data('owl-item').clone === false;
		});

		this.num.oItems = this.dom.$oItems.length;
		// update index on original items

		for (k = 0; k < this.num.oItems; k++) {
			item = this.dom.$oItems.eq(k);
			item.data('owl-item').index = k;
		}
	};

	/**
	 * Creates clones for infinity loop.
	 * @protected
	 */
	Owl.prototype.loopClone = function() {
		if (!this.settings.loop || this.num.oItems < this.settings.items) {
			return false;
		}

		var append, prepend, i,
			items = this.settings.items,
			last = this.num.oItems - 1;

		// if neighbour margin then add one more duplicat
		if (this.settings.stagePadding && this.settings.items === 1) {
			items += 1;
		}
		this.num.cItems = items * 2;

		for (i = 0; i < items; i++) {
			append = this.cloneItemContainer(this.dom.$oItems.eq(i));
			prepend = this.cloneItemContainer(this.dom.$oItems.eq(last - i));

			this.dom.$stage.append(append);
			this.dom.$stage.prepend(prepend);
		}

		this.dom.$cItems = this.dom.$stage.find('.' + this.settings.itemClass).filter(function() {
			return $(this).data('owl-item').clone === true;
		});
	};

	/**
	 * Update cloned elements.
	 * @protected
	 */
	Owl.prototype.reClone = function() {
		// remove cloned items
		if (this.dom.$cItems !== null) { // && (this.num.oItems !== 0 &&
			// this.num.oItems <=
			// this.settings.items)){
			this.dom.$cItems.remove();
			this.dom.$cItems = null;
			this.num.cItems = 0;
		}

		if (!this.settings.loop) {
			return;
		}
		// generete new elements
		this.loopClone();
	};

	/**
	 * Updates all items index data.
	 * @protected
	 */
	Owl.prototype.calculate = function() {

		var i, j, elMinusMargin, dist, allItems, iWidth,  mergeNumber,  posLeft = 0, fullWidth = 0;

		// element width minus neighbour
		this.width.el = this.dom.$el.width() - (this.settings.stagePadding * 2);

		// to check
		this.width.view = this.dom.$el.width();

		// calculate width minus addition margins
		elMinusMargin = this.width.el - (this.settings.margin * (this.settings.items === 1 ? 0 : this.settings.items - 1));

		// calculate element width and item width
		this.width.el = this.width.el + this.settings.margin;
		this.width.item = ((elMinusMargin / this.settings.items) + this.settings.margin).toFixed(3);

		this.dom.$items = this.dom.$stage.find('.owl-item');
		this.num.items = this.dom.$items.length;

		// change to autoWidths
		if (this.settings.autoWidth) {
			this.dom.$items.css('width', '');
		}

		// Set grid array
		this._coordinates = [];
		this.num.merged = [];

		// item distances
		if (this.settings.rtl) {
			dist = this.settings.center ? -((this.width.el) / 2) : 0;
		} else {
			dist = this.settings.center ? (this.width.el) / 2 : 0;
		}

		this.width.mergeStage = 0;

		// Calculate items positions
		for (i = 0; i < this.num.items; i++) {

			// check merged items

			if (this.settings.merge) {
				mergeNumber = this.dom.$items.eq(i).find('[data-merge]').attr('data-merge') || 1;
				if (this.settings.mergeFit && mergeNumber > this.settings.items) {
					mergeNumber = this.settings.items;
				}
				this.num.merged.push(parseInt(mergeNumber));
				this.width.mergeStage += this.width.item * this.num.merged[i];
			} else {
				this.num.merged.push(1);
			}

			iWidth = this.width.item * this.num.merged[i];

			// autoWidth item size
			if (this.settings.autoWidth) {
				iWidth = this.dom.$items.eq(i).width() + this.settings.margin;
				if (this.settings.rtl) {
					this.dom.$items[i].style.marginLeft = this.settings.margin + 'px';
				} else {
					this.dom.$items[i].style.marginRight = this.settings.margin + 'px';
				}

			}
			// push item position into array
			this._coordinates.push(dist);

			// update item data
			this.dom.$items.eq(i).data('owl-item').posLeft = posLeft;
			this.dom.$items.eq(i).data('owl-item').width = iWidth;

			// dist starts from middle of stage if center
			// posLeft always starts from 0
			if (this.settings.rtl) {
				dist += iWidth;
				posLeft += iWidth;
			} else {
				dist -= iWidth;
				posLeft -= iWidth;
			}

			fullWidth -= Math.abs(iWidth);

			// update position if center
			if (this.settings.center) {
				this._coordinates[i] = !this.settings.rtl ? this._coordinates[i] - (iWidth / 2) : this._coordinates[i]
					+ (iWidth / 2);
			}
		}

		if (this.settings.autoWidth) {
			this.width.stage = this.settings.center ? Math.abs(fullWidth) : Math.abs(dist);
		} else {
			this.width.stage = Math.abs(fullWidth);
		}

		// update indexAbs on all items
		allItems = this.num.oItems + this.num.cItems;

		for (j = 0; j < allItems; j++) {
			this.dom.$items.eq(j).data('owl-item').indexAbs = j;
		}

		// Recalculate grid
		this.setSizes();
	};

	/**
	 * Set sizes on elements from `collectData`.
	 * @protected
	 * @todo CRAZY FIX!!! Doublecheck this!
	 */
	Owl.prototype.setSizes = function() {

		// show neighbours
		if (this.settings.stagePadding !== false) {
			this.dom.oStage.style.paddingLeft = this.settings.stagePadding + 'px';
			this.dom.oStage.style.paddingRight = this.settings.stagePadding + 'px';
		}

		// if(this.width.stagePrev > this.width.stage){
		if (this.settings.rtl) {
			window.setTimeout($.proxy(function() {
				this.dom.stage.style.width = this.width.stage + 'px';
			}, this), 0);
		} else {
			this.dom.stage.style.width = this.width.stage + 'px';
		}

		for (var i = 0; i < this.num.items; i++) {

			// Set items width
			if (!this.settings.autoWidth) {
				this.dom.$items[i].style.width = this.width.item - (this.settings.margin) + 'px';
			}
			// add margin
			if (this.settings.rtl) {
				this.dom.$items[i].style.marginLeft = this.settings.margin + 'px';
			} else {
				this.dom.$items[i].style.marginRight = this.settings.margin + 'px';
			}

			if (this.num.merged[i] !== 1 && !this.settings.autoWidth) {
				this.dom.$items[i].style.width = (this.width.item * this.num.merged[i]) - (this.settings.margin) + 'px';
			}
		}

		// save prev stage size
		this.width.stagePrev = this.width.stage;
	};

	/**
	 * Updates all data by calling `refresh`.
	 * @protected
	 */
	Owl.prototype.responsive = function() {

		if (!this.num.oItems) {
			return false;
		}
		// If El width hasnt change then stop responsive
		var elChanged = this.isElWidthChanged();
		if (!elChanged) {
			return false;
		}

		if (this.trigger('resize').isDefaultPrevented()) {
			return false;
		}

		this.state.responsive = true;
		this.refresh();
		this.state.responsive = false;

		this.trigger('resized');
	};

	/**
	 * Refreshes the carousel primarily for adaptive purposes.
	 * @public
	 */
	Owl.prototype.refresh = function() {
		var current = this.dom.$oItems && this.dom.$oItems.eq(this.normalize(this.current(), true));

		this.trigger('refresh');

		// Update Options for given width
		this.setResponsiveOptions();

		// update info about local content
		this.updateLocalContent();

		// udpate options
		this.optionsLogic();

		// if no items then stop
		if (this.num.oItems === 0) {
			return false;
		}

		// Hide and Show methods helps here to set a proper widths.
		// This prevents Scrollbar to be calculated in stage width
		this.dom.$stage.addClass('owl-refresh');

		// Remove clones and generate new ones
		this.reClone();

		// calculate
		this.calculate();

		// aaaand show.
		this.dom.$stage.removeClass('owl-refresh');

		if (!current) {
			this.dom.oStage.scrollLeft = 0;
			this.reset(this.dom.$oItems.eq(0).data('owl-item').indexAbs);
		} else {
			this.reset(current.data('owl-item').indexAbs); // fix that
		}

		this.state.orientation = window.orientation;

		this.watchVisibility();

		this.trigger('refreshed');
	};

	/**
	 * Updates information about current state of items (visibile, hidden, active, etc.).
	 * @protected
	 */
	Owl.prototype.updateActiveItems = function() {
		this.trigger('change', { property: { name: 'items', value: this.dom.$items } });

		var i, j, item, ipos, iwidth, outsideView;

		// clear states
		for (i = 0; i < this.num.items; i++) {
			this.dom.$items.eq(i).data('owl-item').active = false;
			this.dom.$items.eq(i).data('owl-item').current = false;
			this.dom.$items.eq(i).removeClass(this.settings.activeClass).removeClass(this.settings.centerClass);
		}

		this.num.active = 0;
		padding = this.settings.stagePadding * 2;
		stageX = this.coordinates(this.current()) + padding;
		view = this.settings.rtl ? this.width.view : -this.width.view;

		for (j = 0; j < this.num.items; j++) {

			item = this.dom.$items.eq(j);
			ipos = item.data('owl-item').posLeft;
			iwidth = item.data('owl-item').width;
			outsideView = this.settings.rtl ? ipos - iwidth - padding : ipos - iwidth + padding;

			if ((this.op(ipos, '<=', stageX) && (this.op(ipos, '>', stageX + view)))
				|| (this.op(outsideView, '<', stageX) && this.op(outsideView, '>', stageX + view))) {

				this.num.active++;

				item.data('owl-item').active = true;
				item.data('owl-item').current = true;
				item.addClass(this.settings.activeClass);

				if (!this.settings.lazyLoad) {
					item.data('owl-item').loaded = true;
				}
				if (this.settings.loop) {
					this.updateClonedItemsState(item.data('owl-item').index);
				}
			}
		}

		if (this.settings.center) {
			this.dom.$items.eq(this.current()).addClass(this.settings.centerClass).data('owl-item').center = true;
		}
		this.trigger('changed', { property: { name: 'items', value: this.dom.$items } });
	};

	/**
	 * Sets current state on sibilings items for center.
	 * @protected
	 */
	Owl.prototype.updateClonedItemsState = function(activeIndex) {

		// find cloned center
		var center, $el, i;
		if (this.settings.center) {
			center = this.dom.$items.eq(this.current()).data('owl-item').index;
		}

		for (i = 0; i < this.num.items; i++) {
			$el = this.dom.$items.eq(i);
			if ($el.data('owl-item').index === activeIndex) {
				$el.data('owl-item').current = true;
				if ($el.data('owl-item').index === center) {
					$el.addClass(this.settings.centerClass);
				}
			}
		}
	};

	/**
	 * Save internal event references and add event based functions.
	 * @protected
	 */
	Owl.prototype.eventsCall = function() {
		// Save events references
		this.e._onDragStart = $.proxy(function(e) {
			this.onDragStart(e);
		}, this);
		this.e._onDragMove = $.proxy(function(e) {
			this.onDragMove(e);
		}, this);
		this.e._onDragEnd = $.proxy(function(e) {
			this.onDragEnd(e);
		}, this);
		this.e._transitionEnd = $.proxy(function(e) {
			this.transitionEnd(e);
		}, this);
		this.e._resizer = $.proxy(function() {
			this.responsiveTimer();
		}, this);
		this.e._responsiveCall = $.proxy(function() {
			this.responsive();
		}, this);
		this.e._preventClick = $.proxy(function(e) {
			this.preventClick(e);
		}, this);
	};

	/**
	 * Checks window `resize` event.
	 * @protected
	 */
	Owl.prototype.responsiveTimer = function() {
		if (this.viewport() === this.width.prevWindow) {
			return false;
		}
		window.clearTimeout(this.resizeTimer);

		this.resizeTimer = window.setTimeout(this.e._responsiveCall, this.settings.responsiveRefreshRate);
		this.width.prevWindow = this.viewport();
	};

	Owl.prototype.eventsRouter = function(event) {

		var type = event.type;

		if (type === "mousedown" || type === "touchstart") {
			this.onDragStart(event);
		} else if (type === "mousemove" || type === "touchmove") {
			this.onDragMove(event);
		} else if (type === "mouseup" || type === "touchend") {
			this.onDragEnd(event);
		} else if (type === "MSPointerCancel" || type === "touchcancel") {
			this.onDragEnd(event);
		}
	};

	/**
	 * Checks for touch/mouse drag options and add necessery event handlers.
	 * @protected
	 */
	Owl.prototype.internalEvents = function() {
		var isTouch = isTouchSupport(),
			isTouchIE = isTouchSupportIE();

		if (this.settings.mouseDrag){
			this.dom.$stage.on('mousedown', $.proxy(function(event) {this.eventsRouter(event)},this));
			this.dom.$stage.on('dragstart', function() {
				return false;
			});
			this.dom.stage.onselectstart = function() {
				return false;
			};
		} else {
			this.dom.$el.addClass('owl-text-select-on');
		}

		if (this.settings.touchDrag && !isTouchIE){
			this.dom.$stage.on('touchstart', $.proxy(function(event) {this.eventsRouter(event)},this));
			this.dom.$stage.on('touchcancel MSPointerCancel', $.proxy(function(event) {this.eventsRouter(event)},this));
		}

		// Catch transitionEnd event
		if (this.transitionEndVendor) {
			this.on(this.dom.stage, this.transitionEndVendor, this.e._transitionEnd, false);
		}

		// Responsive
		if (this.settings.responsive !== false) {
			this.on(window, 'resize', this.e._resizer, false);
		}

	};

	function getTouches(event) {
		if (event.touches !== undefined) {
			return {
				x: event.touches[0].pageX,
				y: event.touches[0].pageY
			};
		}

		if (event.touches === undefined) {
			if (event.pageX !== undefined) {
				return {
					x: event.pageX,
					y: event.pageY
				};
			}

		if (event.pageX === undefined) {
			return {
					x: event.clientX,
					y: event.clientY
				};
			}
		}
	}

	/**
	 * Handles touchstart/mousedown event.
	 * @protected
	 * @param {Event} event - The event arguments.
	 */
	Owl.prototype.onDragStart = function(event) {
		var ev, isTouchEvent, pageX, pageY, animatedPos;

		ev = event.originalEvent || event || window.event;

		// prevent right click
		if (ev.which === 3 || this.state.isTouch) {
			return false;
		}

		if (ev.type === 'mousedown') {
			this.dom.$stage.addClass('owl-grab');
		}

		this.trigger('drag');
		this.drag.startTime = new Date().getTime();
		this.speed(0);
		this.state.isTouch = true;
		this.state.isScrolling = false;
		this.state.isSwiping = false;
		this.drag.distance = 0;

        pageX = getTouches(ev).x;
        pageY = getTouches(ev).y;

		// get stage position left
		this.drag.offsetX = this.dom.$stage.position().left - this.settings.stagePadding;
		this.drag.offsetY = this.dom.$stage.position().top;

		if (this.settings.rtl) {
			this.drag.offsetX = this.dom.$stage.position().left + this.width.stage - this.width.el
				+ this.settings.margin;
		}

		// catch position // ie to fix
		if (this.state.inMotion && this.support3d) {
			animatedPos = this.getTransformProperty();
			this.drag.offsetX = animatedPos;
			this.animate(animatedPos);
			this.state.inMotion = true;
		} else if (this.state.inMotion && !this.support3d) {
			this.state.inMotion = false;
			return false;
		}

		this.drag.startX = pageX - this.drag.offsetX;
		this.drag.startY = pageY - this.drag.offsetY;

		this.drag.start = pageX - this.drag.startX;
		this.drag.targetEl = ev.target || ev.srcElement;
		this.drag.updatedX = this.drag.start;

		// to do/check
		// prevent links and images dragging;
		if (this.drag.targetEl.tagName === "IMG" || this.drag.targetEl.tagName === "A") {
			this.drag.targetEl.draggable = false;
		}

		$(document).on('mousemove.owl.dragEvents mouseup.owl.dragEvents touchmove.owl.dragEvents touchend.owl.dragEvents', $.proxy(function(event) {this.eventsRouter(event)},this));
	};

	/**
	 * Handles the touchmove/mousemove events.
	 * @todo Simplify
	 * @protected
	 * @param {Event} event - The event arguments.
	 */
	Owl.prototype.onDragMove = function(event) {
		var ev, isTouchEvent, pageX, pageY, minValue, maxValue, pull;

		if (!this.state.isTouch) {
			return;
		}

		if (this.state.isScrolling) {
			return;
		}

		ev = event.originalEvent || event || window.event;

        pageX = getTouches(ev).x;
        pageY = getTouches(ev).y;

		// Drag Direction
		this.drag.currentX = pageX - this.drag.startX;
		this.drag.currentY = pageY - this.drag.startY;
		this.drag.distance = this.drag.currentX - this.drag.offsetX;

		// Check move direction
		if (this.drag.distance < 0) {
			this.state.direction = this.settings.rtl ? 'right' : 'left';
		} else if (this.drag.distance > 0) {
			this.state.direction = this.settings.rtl ? 'left' : 'right';
		}
		// Loop
		if (this.settings.loop) {
			if (this.op(this.drag.currentX, '>', this.coordinates(this.minimum())) && this.state.direction === 'right') {
				this.drag.currentX -= (this.settings.center && this.coordinates(0)) - this.coordinates(this.num.oItems);
			} else if (this.op(this.drag.currentX, '<', this.coordinates(this.maximum())) && this.state.direction === 'left') {
				this.drag.currentX += (this.settings.center && this.coordinates(0)) - this.coordinates(this.num.oItems);
			}
		} else {
			// pull
			minValue = this.settings.rtl ? this.coordinates(this.maximum()) : this.coordinates(this.minimum());
			maxValue = this.settings.rtl ? this.coordinates(this.minimum()) : this.coordinates(this.maximum());
			pull = this.settings.pullDrag ? this.drag.distance / 5 : 0;
			this.drag.currentX = Math.max(Math.min(this.drag.currentX, minValue + pull), maxValue + pull);
		}

		// Lock browser if swiping horizontal

		if ((this.drag.distance > 8 || this.drag.distance < -8)) {
			if (ev.preventDefault !== undefined) {
				ev.preventDefault();
			} else {
				ev.returnValue = false;
			}
			this.state.isSwiping = true;
		}

		this.drag.updatedX = this.drag.currentX;

		// Lock Owl if scrolling
		if ((this.drag.currentY > 16 || this.drag.currentY < -16) && this.state.isSwiping === false) {
			this.state.isScrolling = true;
			this.drag.updatedX = this.drag.start;
		}

		this.animate(this.drag.updatedX);
	};

	/**
	 * Handles the touchend/mouseup events.
	 * @protected
	 */
	Owl.prototype.onDragEnd = function(event) {
		var compareTimes, distanceAbs, closest;

		if (!this.state.isTouch) {
			return;
		}
		if (event.type === 'mouseup') {
			this.dom.$stage.removeClass('owl-grab');
		}

		this.trigger('dragged');

		// prevent links and images dragging;
		this.drag.targetEl.removeAttribute("draggable");

		// remove drag event listeners

		this.state.isTouch = false;
		this.state.isScrolling = false;
		this.state.isSwiping = false;

		// to check
		if (this.drag.distance === 0 && this.state.inMotion !== true) {
			this.state.inMotion = false;
			return false;
		}

		// prevent clicks while scrolling

		this.drag.endTime = new Date().getTime();
		compareTimes = this.drag.endTime - this.drag.startTime;
		distanceAbs = Math.abs(this.drag.distance);

		// to test
		if (distanceAbs > 3 || compareTimes > 300) {
			this.removeClick(this.drag.targetEl);
		}

		closest = this.closest(this.drag.updatedX);

		this.speed(this.settings.dragEndSpeed || this.settings.smartSpeed);
		this.current(closest);

		// if pullDrag is off then fire transitionEnd event manually when stick
		// to border
		if (!this.settings.pullDrag && this.drag.updatedX === this.coordinates(closest)) {
			this.transitionEnd();
		}

		this.drag.distance = 0;

		$(document).off('.owl.dragEvents');
	};

	/**
	 * Attaches `preventClick` to disable link while swipping.
	 * @protected
	 * @param {HTMLElement} [target] - The target of the `click` event.
	 */
	Owl.prototype.removeClick = function(target) {
		this.drag.targetEl = target;
		$(target).on('click.preventClick', this.e._preventClick);
		// to make sure click is removed:
		window.setTimeout(function() {
			$(target).off('click.preventClick');
		}, 300);
	};

	/**
	 * Suppresses click event.
	 * @protected
	 * @param {Event} ev - The event arguments.
	 */
	Owl.prototype.preventClick = function(ev) {
		if (ev.preventDefault) {
			ev.preventDefault();
		} else {
			ev.returnValue = false;
		}
		if (ev.stopPropagation) {
			ev.stopPropagation();
		}
		$(ev.target).off('click.preventClick');
	};

	/**
	 * Catches stage position while animate (only CSS3).
	 * @protected
	 * @returns
	 */
	Owl.prototype.getTransformProperty = function() {
		var transform, matrix3d;

		transform = window.getComputedStyle(this.dom.stage, null).getPropertyValue(this.vendorName + 'transform');
		// var transform = this.dom.$stage.css(this.vendorName + 'transform')
		transform = transform.replace(/matrix(3d)?\(|\)/g, '').split(',');
		matrix3d = transform.length === 16;

		return matrix3d !== true ? transform[4] : transform[12];
	};

	/**
	 * Gets absolute position of the closest item for a coordinate.
	 * @protected
	 * @param {Number} coordinate - The coordinate in pixel.
	 * @return {Number} - The absolute position of the closest item.
	 */
	Owl.prototype.closest = function(coordinate) {
		var position = 0, pull = 30;

		if (!this.settings.freeDrag) {
			// check closest item
			$.each(this.coordinates(), $.proxy(function(index, value) {
				if (coordinate > value - pull && coordinate < value + pull) {
					position = index;
				} else if (this.op(coordinate, '<', value)
					&& this.op(coordinate, '>', this.coordinates(index + 1) || value - this.width.el)) {
					position = this.state.direction === 'left' ? index + 1 : index;
				}
			}, this));
		}

		if (!this.settings.loop) {
			// non loop boundries
			if (this.op(coordinate, '>', this.coordinates(this.minimum()))) {
				position = coordinate = this.minimum();
			} else if (this.op(coordinate, '<', this.coordinates(this.maximum()))) {
				position = coordinate = this.maximum();
			}
		}

		return position;
	};

	/**
	 * Animates the stage.
	 * @public
	 * @param {Number} coordinate - The coordinate in pixels.
	 */
	Owl.prototype.animate = function(coordinate) {
		this.trigger('translate');
		this.state.inMotion = this.speed() > 0;

		if (this.support3d) {
			this.dom.$stage.css({
				transform: 'translate3d(' + coordinate + 'px' + ',0px, 0px)',
				transition: (this.speed() / 1000) + 's'
			});
		} else if (this.state.isTouch) {
			this.dom.$stage.css({
				left: coordinate + 'px'
			});
		} else {
			this.dom.$stage.animate({
				left: coordinate
			}, this.speed() / 1000, this.settings.fallbackEasing, $.proxy(function() {
				if (this.state.inMotion) {
					this.transitionEnd();
				}
			}, this));
		}
	};

	/**
	 * Sets the absolute position of the current item.
	 * @public
	 * @param {Number} [position] - The new absolute position or nothing to leave it unchanged.
	 * @returns {Number} - The absolute position of the current item.
	 */
	Owl.prototype.current = function(position) {
		if (position === undefined) {
			return this._current;
		}

		if (this.num.oItems === 0) {
			return undefined;
		}

		position = this.normalize(position);

		if (this._current === position) {
			this.animate(this.coordinates(this._current));
		} else {
			var event = this.trigger('change', { property: { name: 'position', value: position } });

			if (event.data !== undefined) {
				position = this.normalize(event.data);
			}

			this._current = position;

			this.animate(this.coordinates(this._current));

			this.updateActiveItems();

			this.trigger('changed', { property: { name: 'position', value: this._current } });
		}

		return this._current;
	};

	/**
	 * Resets the absolute position of the current item.
	 * @public
	 * @param {Number} position - The absolute position of the new item.
	 */
	Owl.prototype.reset = function(position) {
		this.suppress([ 'change', 'changed' ]);
		this.speed(0);
		this.current(position);
		this.release([ 'change', 'changed' ]);
	};

	/**
	 * Normalizes an absolute position for an item.
	 * @public
	 * @param {Number} position - The absolute position to normalize.
	 * @param {Boolean} [relative=false] - Whether to return a relative position or not.
	 * @return {Number} - The normalized position.
	 */
	Owl.prototype.normalize = function(position, relative) {
		if (position === undefined || !this.dom.$items) {
			return undefined;
		}

		if (this.settings.loop) {
			var n = this.dom.$items.length;
			position = ((position % n) + n) % n;
		} else {
			position = Math.max(this.minimum(), Math.min(this.maximum(), position));
		}

		return relative ? this.dom.$items.eq(position).data('owl-item').index : position;
	};

	/**
	 * Gets the absolute maximum position for an item.
	 * @public
	 * @returns {Number}
	 */
	Owl.prototype.maximum = function() {
		var maximum, width,
			settings = this.settings;

		if (!settings.loop && settings.center) {
			maximum = this.num.oItems - 1;
		} else if (!settings.loop && !settings.center) {
			maximum = this.num.oItems - settings.items;
		} else if (settings.loop || settings.center) {
			maximum = this.num.oItems + settings.items;
		} else if (settings.autoWidth || settings.merge) {
			revert = settings.rtl ? 1 : -1;
			width = this.dom.$stage.width() - this.$el.width();
			$.each(this.coordinates(), function(index, coordinate) {
				if (coordinate * revert >= width) {
					return false;
				}
				maximum = index + 1;
			});
		} else {
			throw 'Can not detect maximum absolute position.'
		}

		return maximum;
	};

	/**
	 * Gets the absolute minimum position for an item.
	 * @public
	 * @returns {Number}
	 */
	Owl.prototype.minimum = function() {
		return this.dom.$oItems.eq(0).data('owl-item').indexAbs;
	};

	/**
	 * Sets the current animation speed.
	 * @public
	 * @param {Number} [speed] - The animation speed in millisecondsor nothing to leave it unchanged.
	 * @returns {Number} - The current animation speed in milliseconds.
	 */
	Owl.prototype.speed = function(speed) {
		if (speed !== undefined) {
			this._speed = speed;
		}

		return this._speed;
	};

	/**
	 * Gets the coordinate for an item.
	 * @public
	 * @param {Number} [position] - The absolute position of the item.
	 * @returns {Number|Array.<Number>} - The coordinate of the item in pixel or all coordinates.
	 */
	Owl.prototype.coordinates = function(position) {
		return position !== undefined ? this._coordinates[position] : this._coordinates;
	};

	/**
	 * Calculates the speed for a translation.
	 * @protected
	 * @param {Number} from - The absolute position of the start item.
	 * @param {Number} to - The absolute position of the target item.
	 * @param {Number} [factor=undefined] - The time factor in milliseconds.
	 * @returns {Number} - The time in milliseconds for the translation.
	 */
	Owl.prototype.duration = function(from, to, factor) {
		return Math.min(Math.max(Math.abs(to - from), 1), 6) * Math.abs((factor || this.settings.smartSpeed));
	};

	/**
	 * Slides to the specified item.
	 * @public
	 * @param {Number} position - The position of the item.
	 * @param {Number} [speed] - The time in milliseconds for the transition.
	 */
	Owl.prototype.to = function(position, speed) {
		if (this.settings.loop) {
			var distance = position - this.normalize(this.current(), true),
				revert = this.current(),
				before = this.current(),
				after = this.current() + distance,
				direction = before - after < 0 ? true : false;

			if (after < this.settings.items && direction === false) {
				revert = this.num.items - (this.settings.items - before) - this.settings.items;
				this.reset(revert);
			} else if (after >= this.num.items - this.settings.items && direction === true) {
				revert = before - this.num.oItems;
				this.reset(revert);
			}
			window.clearTimeout(this.e._goToLoop);
			this.e._goToLoop = window.setTimeout($.proxy(function() {
				this.speed(this.duration(this.current(), revert + distance, speed));
				this.current(revert + distance);
			}, this), 30);
		} else {
			this.speed(this.duration(this.current(), position, speed));
			this.current(position);
		}
	};

	/**
	 * Slides to the next item.
	 * @public
	 * @param {Number} [speed] - The time in milliseconds for the transition.
	 */
	Owl.prototype.next = function(speed) {
		speed = speed || false;
		this.to(this.normalize(this.current(), true) + 1, speed);
	};

	/**
	 * Slides to the previous item.
	 * @public
	 * @param {Number} [speed] - The time in milliseconds for the transition.
	 */
	Owl.prototype.prev = function(speed) {
		speed = speed || false;
		this.to(this.normalize(this.current(), true) - 1, speed);
	};

	/**
	 * Handles the end of an animation.
	 * @protected
	 * @param {Event} event - The event arguments.
	 */
	Owl.prototype.transitionEnd = function(event) {

		// if css2 animation then event object is undefined
		if (event !== undefined) {
			event.stopPropagation();

			// Catch only owl-stage transitionEnd event
			var eventTarget = event.target || event.srcElement || event.originalTarget;
			if (eventTarget !== this.dom.stage) {
				return false;
			}
		}

		this.state.inMotion = false;
		this.trigger('translated');
	};

	/**
	 * Checks if element width has changed
	 * @protected
	 * @returns {Booelan}
	 */
	Owl.prototype.isElWidthChanged = function() {
		var newElWidth = this.dom.$el.width() - this.settings.stagePadding, // to
		// check
		prevElWidth = this.width.el + this.settings.margin;
		return newElWidth !== prevElWidth;
	};

	/**
	 * Gets viewport width.
	 * @protected
	 * @return {Number} - The width in pixel.
	 */
	Owl.prototype.viewport = function() {
		var width;
		if (this.options.responsiveBaseElement !== window) {
			width = $(this.options.responsiveBaseElement).width();
		} else if (window.innerWidth) {
			width = window.innerWidth;
		} else if (document.documentElement && document.documentElement.clientWidth) {
			width = document.documentElement.clientWidth;
		} else {
			throw 'Can not detect viewport width.';
		}
		return width;
	};

	/**
	 * Replaces the current content.
	 * @public
	 * @param {HTMLElement|jQuery|String} content - The new content.
	 */
	Owl.prototype.insertContent = function(content) {
		this.dom.$stage.empty();
		this.fetchContent(content);
		this.refresh();
	};

	/**
	 * Adds an item.
	 * @public
	 * @param {HTMLElement|jQuery|String} content - The item content to add.
	 * @param {Number} [position=0] - The position at which to insert the item.
	 */
	Owl.prototype.addItem = function(content, position) {
		var $item = this.createItemContainer();

		position = position || 0;
		// wrap content
		this.initializeItemContainer($item, content);
		// if carousel is empty then append item
		if (this.dom.$oItems.length === 0) {
			this.dom.$stage.append($item);
		} else {
			// append item
			if (pos !== -1) {
				this.dom.$oItems.eq(position).before($item);
			} else {
				this.dom.$oItems.eq(position).after($item);
			}
		}
		// update and calculate carousel
		this.refresh();
	};

	/**
	 * Removes an item.
	 * @public
	 * @param {Number} pos - The position of the item.
	 */
	Owl.prototype.removeItem = function(pos) {
		this.dom.$oItems.eq(pos).remove();
		this.refresh();
	};

	/**
	 * Adds triggerable events.
	 * @protected
	 */
	Owl.prototype.addTriggerableEvents = function() {
		var handler = $.proxy(function(callback, event) {
			return $.proxy(function(e) {
				if (e.relatedTarget !== this) {
					this.suppress([ event ]);
					callback.apply(this, [].slice.call(arguments, 1));
					this.release([ event ]);
				}
			}, this);
		}, this);

		$.each({
			'next': this.next,
			'prev': this.prev,
			'to': this.to,
			'destroy': this.destroy,
			'refresh': this.refresh,
			'replace': this.insertContent,
			'add': this.addItem,
			'remove': this.removeItem
		}, $.proxy(function(event, callback) {
			this.dom.$el.on(event + '.owl.carousel', handler(callback, event + '.owl.carousel'));
		}, this));

	};

	/**
	 * Watches the visibility of the carousel element.
	 * @protected
	 */
	Owl.prototype.watchVisibility = function() {

		// test on zepto
		if (!isElVisible(this.dom.el)) {
			this.dom.$el.addClass('owl-hidden');
			window.clearInterval(this.e._checkVisibile);
			this.e._checkVisibile = window.setInterval($.proxy(checkVisible, this), 500);
		}

		function isElVisible(el) {
			return el.offsetWidth > 0 && el.offsetHeight > 0;
		}

		function checkVisible() {
			if (isElVisible(this.dom.el)) {
				this.dom.$el.removeClass('owl-hidden');
				this.refresh();
				window.clearInterval(this.e._checkVisibile);
			}
		}
	};

	/**
	 * Preloads images with auto width.
	 * @protected
	 * @todo Still to test
	 */
	Owl.prototype.preloadAutoWidthImages = function(imgs) {
		var loaded, that, $el, img;

		loaded = 0;
		that = this;
		imgs.each(function(i, el) {
			$el = $(el);
			img = new Image();

			img.onload = function() {
				loaded++;
				$el.attr('src', img.src);
				$el.css('opacity', 1);
				if (loaded >= imgs.length) {
					that.state.imagesLoaded = true;
					that.init();
				}
			};

			img.src = $el.attr('src') || $el.attr('data-src') || $el.attr('data-src-retina');
		});
	};

	/**
	 * Destroys the carousel.
	 * @public
	 */
	Owl.prototype.destroy = function() {

		if (this.dom.$el.hasClass(this.settings.themeClass)) {
			this.dom.$el.removeClass(this.settings.themeClass);
		}

		if (this.settings.responsive !== false) {
			this.off(window, 'resize', this.e._resizer);
		}

		if (this.transitionEndVendor) {
			this.off(this.dom.stage, this.transitionEndVendor, this.e._transitionEnd);
		}

		for ( var i in this.plugins) {
			this.plugins[i].destroy();
		}

		if (this.settings.mouseDrag || this.settings.touchDrag) {

			this.dom.$stage.off('mousedown touchstart');
			$(document).off('.owl.dragEvents');
			this.dom.stage.onselectstart = function() {};
			this.dom.$stage.off('dragstart', function() {
				return false;
			});
		}

		// Remove event handlers in the ".owl.carousel" namespace
		this.dom.$el.off('.owl');

		if (this.dom.$cItems !== null) {
			this.dom.$cItems.remove();
		}
		this.e = null;
		this.dom.$el.data('owlCarousel', null);
		delete this.dom.el.owlCarousel;

		this.dom.$stage.unwrap();
		this.dom.$items.unwrap();
		this.dom.$items.contents().unwrap();
		this.dom = null;
	};

	/**
	 * Operators to calculate right-to-left and left-to-right.
	 * @protected
	 * @param {Number} [a] - The left side operand.
	 * @param {String} [o] - The operator.
	 * @param {Number} [b] - The right side operand.
	 */
	Owl.prototype.op = function(a, o, b) {
		var rtl = this.settings.rtl;
		switch (o) {
		case '<':
			return rtl ? a > b : a < b;
		case '>':
			return rtl ? a < b : a > b;
		case '>=':
			return rtl ? a <= b : a >= b;
		case '<=':
			return rtl ? a >= b : a <= b;
		default:
			break;
		}
	};

	/**
	 * Attaches to an internal event.
	 * @protected
	 * @param {HTMLElement} element - The event source.
	 * @param {String} event - The event name.
	 * @param {Function} listener - The event handler to attach.
	 * @param {Boolean} capture - Wether the event should be handled at the capturing phase or not.
	 */
	Owl.prototype.on = function(element, event, listener, capture) {
		if (element.addEventListener) {
			element.addEventListener(event, listener, capture);
		} else if (element.attachEvent) {
			element.attachEvent('on' + event, listener);
		}
	};

	/**
	 * Detaches from an internal event.
	 * @protected
	 * @param {HTMLElement} element - The event source.
	 * @param {String} event - The event name.
	 * @param {Function} listener - The attached event handler to detach.
	 * @param {Boolean} capture - Wether the attached event handler was registered as a capturing listener or not.
	 */
	Owl.prototype.off = function(element, event, listener, capture) {
		if (element.removeEventListener) {
			element.removeEventListener(event, listener, capture);
		} else if (element.detachEvent) {
			element.detachEvent('on' + event, listener);
		}
	};

	/**
	 * Triggers an public event.
	 * @protected
	 * @param {String} name - The event name.
	 * @param {*} [data=null] - The event data.
	 * @param {String} [namespace=.owl.carousel] - The event namespace.
	 * @returns {Event} - The event arguments.
	 */
	Owl.prototype.trigger = function(name, data, namespace) {
		var status = {
			item: { count: this.num.oItems, index: this.current() }
		}, handler = $.camelCase(
			$.grep([ 'on', name, namespace ], function(v) { return v })
				.join('-').toLowerCase()
		), event = $.Event(
			[ name, 'owl', namespace || 'carousel' ].join('.').toLowerCase(),
			$.extend({ relatedTarget: this }, status, data)
		);

		if (!this._supress[event.type]) {
			$.each(this.plugins, function(name, plugin) {
				if (plugin.onTrigger) {
					plugin.onTrigger(event);
				}
			});

			this.dom.$el.trigger(event);

			if (typeof this.settings[handler] === 'function') {
				this.settings[handler].apply(this, event);
			}
		}

		return event;
	};

	/**
	 * Suppresses events.
	 * @protected
	 * @param {Array.<String>} events - The events to suppress.
	 */
	Owl.prototype.suppress = function(events) {
		$.each(events, $.proxy(function(index, event) {
			this._supress[event] = true;
		}, this));
	}

	/**
	 * Releases suppressed events.
	 * @protected
	 * @param {Array.<String>} events - The events to release.
	 */
	Owl.prototype.release = function(events) {
		$.each(events, $.proxy(function(index, event) {
			delete this._supress[event];
		}, this));
	}

	/**
	 * Checks the availability of some browser features.
	 * @protected
	 */
	Owl.prototype.browserSupport = function() {
		this.support3d = isPerspective();

		if (this.support3d) {
			this.transformVendor = isTransform();

			// take transitionend event name by detecting transition
			var endVendors = [ 'transitionend', 'webkitTransitionEnd', 'transitionend', 'oTransitionEnd' ];
			this.transitionEndVendor = endVendors[isTransition()];

			// take vendor name from transform name
			this.vendorName = this.transformVendor.replace(/Transform/i, '');
			this.vendorName = this.vendorName !== '' ? '-' + this.vendorName.toLowerCase() + '-' : '';
		}

		this.state.orientation = window.orientation;
	};

	/**
	 * Checks for CSS support.
	 * @private
	 * @param {Array} array - The CSS properties to check for.
	 * @returns {Array} - Contains the supported CSS property name and its index or `false`.
	 */
	function isStyleSupported(array) {
		var p, s, fake = document.createElement('div'), list = array;
		for (p in list) {
			s = list[p];
			if (typeof fake.style[s] !== 'undefined') {
				fake = null;
				return [ s, p ];
			}
		}
		return [ false ];
	}

	/**
	 * Checks for CSS transition support.
	 * @private
	 * @todo Realy bad design
	 * @returns {Number}
	 */
	function isTransition() {
		return isStyleSupported([ 'transition', 'WebkitTransition', 'MozTransition', 'OTransition' ])[1];
	}

	/**
	 * Checks for CSS transform support.
	 * @private
	 * @returns {String} The supported property name or false.
	 */
	function isTransform() {
		return isStyleSupported([ 'transform', 'WebkitTransform', 'MozTransform', 'OTransform', 'msTransform' ])[0];
	}

	/**
	 * Checks for CSS perspective support.
	 * @private
	 * @returns {String} The supported property name or false.
	 */
	function isPerspective() {
		return isStyleSupported([ 'perspective', 'webkitPerspective', 'MozPerspective', 'OPerspective', 'MsPerspective' ])[0];
	}

	/**
	 * Checks wether touch is supported or not.
	 * @private
	 * @returns {Boolean}
	 */
	function isTouchSupport() {
		return 'ontouchstart' in window || !!(navigator.msMaxTouchPoints);
	}

	/**
	 * Checks wether touch is supported or not for IE.
	 * @private
	 * @returns {Boolean}
	 */
	function isTouchSupportIE() {
		return window.navigator.msPointerEnabled;
	}

	/**
	 * The jQuery Plugin for the Owl Carousel
	 * @public
	 */
	$.fn.owlCarousel = function(options) {
		return this.each(function() {
			if (!$(this).data('owlCarousel')) {
				$(this).data('owlCarousel', new Owl(this, options));
			}
		});
	};

	/**
	 * The constructor for the jQuery Plugin
	 * @public
	 */
	$.fn.owlCarousel.Constructor = Owl;

})(window.Zepto || window.jQuery, window, document);
