var casper = require('casper').create();

// options
// =======

var email    = casper.cli.get('email');
var password = casper.cli.get('password');

if (!email) {
  casper.die('--email required');
}
if (!password) {
  casper.die('--password required');
}

// callbacks
// =========

var errorCodes = ['404', '500', '503'];

for (var i = 0; i < errorCodes.length; ++i) {
  casper.on('http.status.' + errorCodes[i], function(res) {
    this.die('Status ' + String(res.status) + ': ' + res.url);
  });
}

// login
// =====

casper.start('https://typesquare.com/users/login');

casper.then(function() {
  this.log('Login: ' + this.getCurrentUrl(), 'debug');

  this.fillSelectors('#UserLoginForm', {
    '#MailAddress': email,
    '#Password':    password
  }, true);
});

casper.then(function() {
  if (this.getCurrentUrl() === 'https://typesquare.com/users/login') {
    this.die('Login failed', 1);
  }
});

// get font list
// =============

var fontProps = [];
var collectFontProps;

casper.thenOpen('https://typesquare.com/fontlist/fontlist/page:1/limit:100');

casper.then(function collectFontProps() {
  this.log('Collecting font info: ' + this.getCurrentUrl(), 'debug');

  var html = this.evaluate(function() { return document.querySelector('html').innerHTML; });

  // get font info
  // -------------

  var props = this.evaluate(function() {
    var els = document.querySelectorAll('#font_sample_container>li');
    if (!els.length) {
      return [];
    }

    var props = [];
    for (var i = 0; i < els.length; ++i) {
      var el = els[i];

      var h1   = el.querySelector('h1');
      var meta = el.querySelectorAll('dl.meta dd');
      var css  = el.querySelector('dl.example_css dd');

      var prop = {};
      prop.fontName = h1 ? h1.textContent.trim() : '';
      prop.language = meta[0] ? meta[0].textContent.trim() : '';
      prop.foundry  = meta[1] ? meta[1].textContent.trim() : '';
      prop.cssNames = css
                    ? css.textContent.trim()
                      .replace(/^font-family:\s+/, '')
                      .split('または')
                      .map(function(x) { return x.trim(); })
                    : [];
      if (prop.fontName) {
        props.push(prop);
      }
    }
    return props;
  });

  fontProps.push.apply(fontProps, props);

  // get next url
  // ------------

  var url = this.evaluate(function() {
    var el = document.querySelector('a.next');
    if (!el) {
      return null;
    }
    return el.href;
  });

  // open next url
  // -------------

  if (url) {
    this.log('Opening next URL: ' + url, 'debug');
    this.thenOpen(url);
    this.then(collectFontProps);
  }
});

// run
// ===

casper.run(function() {
  this.log('Done', 'debug');
  this.echo(JSON.stringify(fontProps, null, "\t"));
  this.exit();
});
