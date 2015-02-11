var client = require('cheerio-httpcli');
var logger = require('log4js').getLogger('typesquare');
var url    = require('url');

module.exports = function(email, password, options, done) {

  var fontProps = [];

  client.fetch('https://typesquare.com/users/login')

    // login
    // =====

    .then(function(res) {
      logger.info('Logging in: ' + res.$.documentInfo().url);

      return res.$('#UserLoginForm').submit({
        'data[User_authentication][mail_address]': email,
        'data[User_authentication][password]':     password,
      });
    })
    .then(function(res) {
      return client.fetch('https://typesquare.com/member');
    })
    .then(function(res) {
      logger.info('Checking login status: ' + res.$.documentInfo().url);

      var $ = res.$;

      var href = $('li.link_login a').attr('href');
      if (!href || !~href.indexOf('/users/logout')) {
        throw new Error('Login failed');
      }
    })

    // collect font props
    // ==================

    .then(function(res) {
      return client.fetch('https://typesquare.com/fontlist/fontlist/page:1/limit:100');
    })
    .then(function collectFontProps(res) {
      logger.info('Collecting font props: ' + res.$.documentInfo().url);

      var $ = res.$;

      // scrape
      // ------

      $('#font_sample_container>li').each(function() {
        var h1   = $(this).find('h1');
        var meta = $(this).find('dl.meta dd');
        var css  = $(this).find('dl.example_css dd');

        var prop = {
          fontName: h1.text() || '',
          language: meta[0] ? $(meta[0]).text() : '',
          foundry:  meta[1] ? $(meta[1]).text() : '',
          cssNames: css ? css.text().trim()
                          .replace(/^font-family:\s+/, '')
                          .split('または')
                          .map(function(x) { return x.trim(); })
                        : [],
        };
        if (prop.fontName) {
          fontProps.push(prop);
        }
      });

      // next
      // ----

      var nextHref = $('a.next').attr('href');

      if (nextHref) {
        var nextUrl = url.resolve($.documentInfo().url, nextHref);

        logger.info('Opening next URL: ' + nextUrl);

        return client.fetch(nextUrl).then(collectFontProps);
      }
    })

    // done
    // ====

    .then(function() {
      done(null, fontProps);
    })
    .catch(function(err) {
      done(err);
    });

};
