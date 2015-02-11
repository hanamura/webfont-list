var client = require('cheerio-httpcli');
var logger = require('log4js').getLogger('fontplus');
var url    = require('url');

module.exports = function(email, password, options, done) {

  var fontProps = [];

  client.fetch('https://webfont.fontplus.jp/users/login')

    // login
    // =====

    .then(function(res) {
      logger.info('Logging in: ' + res.$.documentInfo().url);

      return res.$('#UserLoginForm').submit({
        'data[User_authentication][mail_address]': email,
        'data[User_authentication][password]':     password,
        'data[User_authentication][entry_type]':   '0020',
      });
    })
    .then(function(res) {
      return client.fetch('https://webfont.fontplus.jp/member');
    })
    .then(function(res) {
      logger.info('Checking login status: ' + res.$.documentInfo().url);

      var $ = res.$;

      var href = $('li.bt_login2 a').attr('href');
      if (!href || !~href.indexOf('/users/logout')) {
        throw new Error('Login failed');
      }
    })

    // collect font props
    // ==================

    .then(function(res) {
      return client.fetch('https://webfont.fontplus.jp/fontlist/fontlist/page:1/limit:100');
    })
    .then(function collectFontProps(res) {
      logger.info('Collecting font props: ' + res.$.documentInfo().url);

      var $ = res.$;

      // scrape
      // ------

      $('.font_box').each(function() {
        var name = $(this).find('.font_name');
        var info = $(this).find('.font_info');
        var css  = $(this).find('.css_tx');

        var m1 = info[0] ? $(info[0])
                             .text()
                             .trim()
                             .match(/^(.+?)｜言語：(.+)$/)
                           : null;
        var m2 = info[1] ? $(info[1])
                             .text()
                             .trim()
                             .match(/^ジャンル：(.+)$/)
                           : null;

        var prop = {
          fontName: name.text() || '',
          language: m1 ? m1[2].trim() : '',
          foundry:  m1 ? m1[1].trim() : '',
          category: m2 ? m2[1].trim() : '',
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

      var nextHref = $('.bt_next a').attr('href');

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
