const St = imports.gi.St;
const Main = imports.ui.main;
const Soup = imports.gi.Soup;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Clutter = imports.gi.Clutter;
const PanelMenu = imports.ui.panelMenu;

const timeFrameMap = {
    'OneHour': '1h'
};
const timeFrame = 'OneHour';
const updateFrequency = 360; // times per hour

const ETORO_URL = 'https://candle.etoro.com/candles/desc.json/' + timeFrame + '/1/100001';

let _httpSession;
const EtoroETHIndicator = new Lang.Class({
    Name: 'EtoroETHIndicator',
    Extends: PanelMenu.Button,

    _init: function () {
        this.parent(0.0, "eToro ETH/USD Indicator", false);
        this.buttonText = new St.Label({
            style_class: 'up',
            text: _("Loading..."),
            y_align: Clutter.ActorAlign.CENTER
        });
        this.actor.add_actor(this.buttonText);
        this._refresh();
    },

    _refresh: function () {
        this._loadData(this._refreshUI);
        this._removeTimeout();
        this._timeout = Mainloop.timeout_add_seconds(3600 / updateFrequency, Lang.bind(this, this._refresh));
        return true;
    },

    _loadData: function () {
        let url = ETORO_URL + '?' + new Date();
        _httpSession = new Soup.Session();
        let message = Soup.form_request_new_from_hash('GET', ETORO_URL, {});
        _httpSession.queue_message(message, Lang.bind(this, function (_httpSession, message) {
                if (message.status_code !== 200)
                    return;
                let json = JSON.parse(message.response_body.data);
                this._refreshUI(json);
            }
            )
        );
    },

    _refreshUI: function (data) {
        const range = data.Candles[0];
        let txt = range.RangeClose.toString();
        const difference = this.roundTo2Dec(range.RangeClose - range.RangeOpen);
        const absDifference = Math.abs(difference);
        const percentageDifference = Math.abs(this.roundTo2Dec(difference / range.RangeClose * 100));
        let sign = difference > 0 ? '↑' : difference === 0 ? ' ' : '↓';
        txt = '$' + txt.substring(0, 6) + ' ' + sign + ' $' + absDifference + ' (' + percentageDifference + '%)' + ' ' + timeFrameMap[timeFrame];
        this.buttonText.set_text(txt);
        this.buttonText.style_class = difference > 0 ? 'up' : 'down';
    },

    _removeTimeout: function () {
        if (this._timeout) {
            Mainloop.source_remove(this._timeout);
            this._timeout = null;
        }
    },

    stop: function () {
        if (_httpSession !== undefined)
            _httpSession.abort();
        _httpSession = undefined;

        if (this._timeout)
            Mainloop.source_remove(this._timeout);
        this._timeout = undefined;

        this.menu.removeAll();
    },

    roundTo2Dec: function (number) {
        const factor = Math.pow(10, 2);
        const tempNumber = number * factor;
        const roundedTempNumber = Math.round(tempNumber);
        return roundedTempNumber / factor;
    }

});

let etoroMenu;

function init() {
}

function enable() {
    etoroMenu = new EtoroETHIndicator;
    Main.panel.addToStatusArea('eth-indicator', etoroMenu);
}

function disable() {
    etoroMenu.stop();
    etoroMenu.destroy();
}
