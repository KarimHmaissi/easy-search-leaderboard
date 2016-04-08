// Set up a collection to contain player information. On the server,
// it is backed by a MongoDB collection named "players".

// Players = new Mongo.Collection("players");
Apps = new Mongo.Collection('Apps');
AppDetails = new Mongo.Collection('AppDetails');

AppsIndex = new EasySearch.Index({
  engine: new EasySearch.MongoDB({
    sort: function () {
      return { name: 1 };
    },
    selector: function (searchObject, options, aggregation) {
      let selector = this.defaultConfiguration().selector(searchObject, options, aggregation),
        categoryFilter = options.search.props.categoryFilter;

      if (_.isString(categoryFilter) && !_.isEmpty(categoryFilter)) {
        selector.category = categoryFilter;
      }

      // selector.type = 'game';

      return selector;
    }
  }),
  collection: Apps,
  fields: ['name', 'type', 'is_free', 'developers'],
  defaultSearchOptions: {
    limit: 8
  },
  permission: () => {
    //console.log(Meteor.userId());

    return true;
  }
});

// Meteor.methods({
//   updateScore: function (playerId) {
//     check(playerId, String);
//     Players.update(playerId, { $inc: { score: 5 }});
//   }
// });

if (Meteor.isClient) {
  Template.leaderboard.helpers({
    inputAttributes: function () {
      return { 'class': 'easy-search-input', 'placeholder': 'Start searching...' };
    },
    apps: function () {
      return Apps.find({}, { sort: { name: 1 } });
    },
    selectedName: function () {
      var app = AppsIndex.config.mongoCollection.findOne({ __originalId: Session.get("selectedApp") });
      return app && app.name;
    },
    index: function () {
      return AppsIndex;
    },
    resultsCount: function () {
      return AppsIndex.getComponentDict().get('count');
    },
    showMore: function () {
      return false;
    },
    renderTmpl: () => Template.renderTemplate
  });

  Template.leaderboard.events({
    // 'click .inc': function () {
    //   Meteor.call('updateScore', Session.get("selectedPlayer"));
    // },
    'change .category-filter': function (e) {
      AppsIndex.getComponentMethods()
        .addProps('categoryFilter', $(e.target).val())
      ;
    }
  });

  Template.app.helpers({
    selected: function () {
      return Session.equals("selectedApp", this.__originalId) ? "selected" : '';
    }
  });

  Template.app.events({
    'click': function () {
      Session.set("selectedApp", this.__originalId);
    }
  });

  Tracker.autorun(() => {
    console.log(AppsIndex .search('Counter-Strike', { limit: 20 }).fetch());
  });

}

// On server startup, create some players if the database is empty.
if (Meteor.isServer) {
var first_names = [
      "Ada",
      "Grace",
      "Marie",
      "Carl",
      "Nikola",
      "Claude",
      "Peter",
      "Stefan",
      "Stephen",
      "Lisa",
      "Christian",
      "Barack"
    ],
    last_names = [
      "Lovelace",
      "Hopper",
      "Curie",
      "Tesla",
      "Shannon",
      "Müller",
      "Meier",
      "Miller",
      "Gaga",
      "Franklin"
    ],
    categories = ["Genius", "Geek", "Hipster", "Idler"];;

  var getAppsList = function (callback) {
    var response = HTTP.get('http://api.steampowered.com/ISteamApps/GetAppList/v0002/').data;
    callback(null, response);
  };

  var getAppDetails = function (appId, callback) {
    var response = HTTP.get('http://store.steampowered.com/api/appdetails/?appids=' + appId).data;
    console.log(appId);
    console.log(response[appId].success);
    if(response[appId].success + "" === "true") {
      console.log('got successful result!!!!!!!');
      callback(null, response[appId].data);
    } else {
      console.log("got false from success");
      return false;
    } 
  };

  var processAppsList = function (err, response) {
   if(response) {
     console.log('got a response');

     var apps = response.applist.apps;
     console.log(apps.length);

     var i = 0, length = apps.length;

     for(i; i < length; i++) {
       Apps.insert(apps[i]);
       console.log(apps[i].name + " saved");
     }
   }
  };


  var getDetails = function () {
    var appIds = Apps.find().fetch();
    var i = 0; length = appIds.length; 

    var callback = function (error, result) {
      if(result) {
        console.log('got successful response');
        console.log(result.type);
        console.log(result.name);
        console.log(result.steam_appid);
        AppDetails.insert(result);
      } else {
        console.log('result was false');
      }
    };

    var interval = Meteor.setInterval(function () {
      var appId = appIds[i].appid;

      getAppDetails(appId, callback);

      i++;
      if(i >= length) {
        clearInterval(interval);
      }

    }, 5000)
  };


  Meteor.startup(function () {

    // getAppsList(processAppsList);
    // getDetails();

  });
}
