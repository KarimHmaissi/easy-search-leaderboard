// Set up a collection to contain player information. On the server,
// it is backed by a MongoDB collection named "players".

Players = new Mongo.Collection("players");
Apps = new Mongo.Collection('Apps');
AppDetails = new Mongo.Collection('AppDetails');

PlayersIndex = new EasySearch.Index({
  engine: new EasySearch.MongoDB({
    sort: function () {
      return { score: -1 };
    },
    selector: function (searchObject, options, aggregation) {
      let selector = this.defaultConfiguration().selector(searchObject, options, aggregation),
        categoryFilter = options.search.props.categoryFilter;

      if (_.isString(categoryFilter) && !_.isEmpty(categoryFilter)) {
        selector.category = categoryFilter;
      }

      return selector;
    }
  }),
  collection: Players,
  fields: ['name'],
  defaultSearchOptions: {
    limit: 8
  },
  permission: () => {
    //console.log(Meteor.userId());

    return true;
  }
});

Meteor.methods({
  updateScore: function (playerId) {
    check(playerId, String);
    Players.update(playerId, { $inc: { score: 5 }});
  }
});

if (Meteor.isClient) {
  Template.leaderboard.helpers({
    inputAttributes: function () {
      return { 'class': 'easy-search-input', 'placeholder': 'Start searching...' };
    },
    players: function () {
      return Players.find({}, { sort: { score: -1, name: 1 } });
    },
    selectedName: function () {
      var player = PlayersIndex.config.mongoCollection.findOne({ __originalId: Session.get("selectedPlayer") });
      return player && player.name;
    },
    index: function () {
      return PlayersIndex;
    },
    resultsCount: function () {
      return PlayersIndex.getComponentDict().get('count');
    },
    showMore: function () {
      return false;
    },
    renderTmpl: () => Template.renderTemplate
  });

  Template.leaderboard.events({
    'click .inc': function () {
      Meteor.call('updateScore', Session.get("selectedPlayer"));
    },
    'change .category-filter': function (e) {
      PlayersIndex.getComponentMethods()
        .addProps('categoryFilter', $(e.target).val())
      ;
    }
  });

  Template.player.helpers({
    selected: function () {
      return Session.equals("selectedPlayer", this.__originalId) ? "selected" : '';
    }
  });

  Template.player.events({
    'click': function () {
      Session.set("selectedPlayer", this.__originalId);
    }
  });

  Tracker.autorun(() => {
    console.log(PlayersIndex.search('Barack', { limit: 20 }).fetch());
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


    i++;
    if(i >= length) {
      clearInterval(interval);
    }

    var interval = Meteor.setInterval(function () {
      var appId = appIds[i].appid;

      getAppDetails(appId, callback);

    }, 5000)
  };


  Meteor.startup(function () {

    // getAppsList(processAppsList);
    getDetails();

    // if (Players.find().count() < 100) {
    //   for (var i = 0; i < 10 * 1000; i++) {
    //     console.log(i + ' doc indexed');
    //     Players.insert({
    //       name: Random.choice(first_names) + ' ' + Random.choice(last_names),
    //       score: Math.floor(Random.fraction() * 1000 / Random.fraction() / 100),
    //       category: Random.choice(categories)
    //     });
    //   }

    //   console.log('done!');
    // }
  });
}
