var bkg = chrome.extension.getBackgroundPage();

var activeDiv = document.getElementById("open-shows-wrapper");
var upcomingDiv = document.getElementById("upcoming-shows");
var showIndex = 0;


/////////////////////////////
// BROADWAY DIRECT SCRAPER //
/////////////////////////////
var bwdirect_xhr = new XMLHttpRequest();
bwdirect_xhr.open("GET", "https://lottery.broadwaydirect.com/");
bwdirect_xhr.onreadystatechange = function() {
  if (bwdirect_xhr.readyState == 4) {
    var resp = bwdirect_xhr.responseText;
    html = $.parseHTML(resp, false);
    cards = $(html).find(".content-card-content");
    shows = [];
    $.each(cards, function(i, card) {
      shows.push(card);
    });
    chrome.storage.sync.set({"shows": shows}, function() {
    });
    $.each(shows, function(i, card) {
      a = $(card).find("a");
      show = a[0].href;
      var xhr = new XMLHttpRequest();
      xhr.open("GET", show);
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
          var resp = xhr.responseText;
          html = $.parseHTML(resp, false);
          dup_lotteries = $(html).find(".lotteries-row").filter(".show-for-desktop");
          lotteries = [];
          ids = [];
          $.each(dup_lotteries, function(i, lottery) {
            if ($.inArray($(lottery).attr("id"), ids) == -1) {
                ids.push($(lottery).attr("id"));
                lotteries.push(lottery);
            }
          });
          $.each(lotteries, function(i, lottery) {
            isActive = $(lottery).find(".active");
            if (isActive.length > 0) {
              var title = $(card).find("a")[0].innerText
              var date = $(lottery).find(".lotteries-time")[0].innerText
              date = date.replace(/\s+/g, ' ').trim();
              var price = $(lottery).find(".price")[0].innerText
              var link = $(lottery).find(".enter-lottery-link").attr("href")
              var lotteryDetails = {
                title: title,
                date:  date,
                price: price,
                link: link,
              }
              renderActiveLotteryRow(lotteryDetails)
              showIndex++;
            }

            isUpcoming = $(lottery).find(".pending");
            if (isUpcoming.length > 0) {
              var lotteryDiv = document.createElement("div");
              lotteryDiv.className = "upcoming-lottery-entry";
              var header = document.createElement("h2");
              $(header).html($(card).find("a")[0].innerText);
              lotteryDiv.append(header);
              lotteryDiv.append(lottery);
              lotteryDiv.append(document.createElement("br"));
              upcomingDiv.append(lotteryDiv);
            }
          });
        }
      };
      xhr.send();
    });
  }
}
bwdirect_xhr.send();
/////////////////////////////////
// END BROADWAY DIRECT SCRAPER //
/////////////////////////////////


////////////////////////
// LUCKY SEAT SCRAPER //
////////////////////////
var lucky_xhr = new XMLHttpRequest();
lucky_xhr.open("GET", "https://www.luckyseat.com/lottery.php");
lucky_xhr.onreadystatechange = function() {
  if (lucky_xhr.readyState == 4) {
    var resp = lucky_xhr.responseText;
    html = $.parseHTML(resp, false);
    var new_york = $(html).find("h4:contains('NEW YORK')");
    var shows = $(new_york[0].parentNode.parentNode).find("a");
    $.each(shows, function(i, show) {
      var title = show.parentNode.previousSibling.previousSibling.previousSibling.previousSibling.innerText
      title = title.toUpperCase().trim() + " (NY)";
      if (title.startsWith("NEW YORK\n    NEW YORK\n\t\n")) {
        title = title.substring(21);
      }
      var link = "https://www.luckyseat.com" + show.pathname;
      var xhr = new XMLHttpRequest();
      xhr.open("GET", link);
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
          var resp = xhr.responseText;
          html = $.parseHTML(resp, false);
          isActive = ($(html).find("h3:contains('CLOSED')").length == 0);
          if (isActive) {
            var price = resp.match("Winning tickets are ...")[0];
            price = price.trim().split(" ");
            price = price[price.length - 1] + ".00";
            var lotteryDetails = {
              title: title,
              date:  "Multiple dates",
              price: price,
              link: link,
            }
            renderActiveLotteryRow(lotteryDetails)
            showIndex++;
          }
        }
      }
      xhr.send();
    });
  }
}
lucky_xhr.send();
////////////////////////////
// END LUCKY SEAT SCRAPER //
///////////////////////////


//////////////////////
// RENDER FUNCTIONS //
//////////////////////
function renderActiveLotteryRow(lotteryDetails) {
  var lotteryDiv = document.createElement("div");
  lotteryDiv.className = "active-lottery-entry";
  var newDiv = document.createElement("div");
  newDiv.className = "active-lottery-details";
  var nameDiv = document.createElement("div");
  var header = document.createElement("h2");
  $(header).html(lotteryDetails.title);
  nameDiv.append(header);
  newDiv.append(nameDiv);
  var dateDiv = document.createElement("div");
  dateDiv.innerHTML = "<span>" + lotteryDetails.date + "</span>";
  newDiv.append(dateDiv);
  var priceDiv = document.createElement("div");
  priceDiv.innerHTML = "<span>" + lotteryDetails.price + "</span>";
  newDiv.append(priceDiv);
  var linkDiv = document.createElement("div");
  linkDiv.innerHTML = "<a href='" +  lotteryDetails.link + "'></a>";
  newDiv.append(linkDiv);
  var checkboxDiv = document.createElement("div");
  var checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = showIndex;
  checkbox.className = "lucky-checkbox";
  var label = document.createElement("label");
  label.setAttribute("for", showIndex);
  label.className = "checkbox-label";
  var checkboxImage = document.createElement("div");
  checkboxImage.innerHTML = "<img src='assets/check.svg'></img>";
  checkboxImage.className = "checkbox-image";
  label.append(checkboxImage);
  checkboxDiv.className = "active-checkbox";
  checkboxDiv.append(checkbox);
  checkboxDiv.append(label);
  lotteryDiv.append(newDiv);
  lotteryDiv.append(checkboxDiv);
  activeDiv.before(lotteryDiv);
}

chrome.storage.sync.get("profile", function(data) {
  if (typeof data.profile === 'undefined') {
    $("#active-shows-container").hide();
    $("#upcoming-shows-container").hide();
    $("#profile-container").show();
    $("#see-active-shows").removeClass("active-tab");
    $("#see-upcoming-shows").removeClass("active-tab");
    $("#edit-profile").addClass("active-tab");
  }
});

$('select.dropdown').dropdown();
//////////////////////////
// END RENDER FUNCTIONS //
//////////////////////////


////////////////////////////
// BUTTON CLICK FUNCTIONS //
////////////////////////////
$("#save-button").click(function () {
  var inputs = {
    "firstName": $("#firstName"),
    "lastName": $("#lastName"),
    "ticketNum": $("#ticketNum"),
    "email": $("#email"),
    "month": $("#month"),
    "day": $("#day"),
    "year": $("#year"),
    "zip": $("#zip"),
    "country": $("#country"),
    "phone": $("#phone")
  };
  if (inputs.ticketNum[0].selectedIndex === -1){
    inputs.ticketNum[0].selectedIndex = 2;
  }
  if (inputs.country[0].selectedIndex === -1){
    inputs.country[0].selectedIndex = 2;
  }
  var profile = {
    "firstname": inputs.firstName.val(),
    "lastname": inputs.lastName.val(),
    "ticketnum": inputs.ticketNum.prop("selectedIndex"),
    "email": inputs.email.val(),
    "month": inputs.month.val(),
    "day": inputs.day.val(),
    "year": inputs.year.val(),
    "zip": inputs.zip.val(),
    "country": inputs.country.prop("selectedIndex"),
    "phone": inputs.phone.val()
  };

  chrome.storage.sync.set({ "profile" : profile }, function() {
  });
  $("#active-shows-container").show();
  $("#upcoming-shows-container").hide();
  $("#profile-container").hide();
  $("#see-active-shows").addClass("active-tab");
  $("#see-upcoming-shows").removeClass("active-tab");
  $("#edit-profile").removeClass("active-tab");
});


$("#edit-profile").click(function () {
  $("#active-shows-container").hide();
  $("#upcoming-shows-container").hide();
  $("#profile-container").show();
  $("#see-active-shows").removeClass("active-tab");
  $("#see-upcoming-shows").removeClass("active-tab");
  $("#edit-profile").addClass("active-tab");
  chrome.storage.sync.get(["profile"], function(result) {
    var profile = result.profile;
    if (profile) {
      var firstName = document.getElementById("firstName");
      var lastName = document.getElementById("lastName");
      var ticketNum = document.getElementById("ticketNum");
      var email = document.getElementById("email");
      var month = document.getElementById("month");
      var day = document.getElementById("day");
      var year = document.getElementById("year");
      var zip = document.getElementById("zip");
      var country = document.getElementById("country");
      var phone = document.getElementById("phone");

      try {
        firstName.value = profile.firstname;
        lastName.value = profile.lastname;
        ticketNum.options.selectedIndex = profile.ticketnum;
        email.value = profile.email;
        month.value = profile.month;
        day.value = profile.day;
        year.value = profile.year;
        zip.value = profile.zip;
        country.options.selectedIndex = profile.country;
        phone.value = profile.phone;
      } catch (e) {
      }
    }
  });
});

$("#see-active-shows").click(function () {
  $("#active-shows-container").show();
  $("#upcoming-shows-container").hide();
  $("#profile-container").hide();
  $("#see-active-shows").addClass("active-tab");
  $("#see-upcoming-shows").removeClass("active-tab");
  $("#edit-profile").removeClass("active-tab");
});

$("#see-upcoming-shows").click(function () {
  $("#active-shows-container").hide();
  $("#upcoming-shows-container").show();
  $("#profile-container").hide();
  $("#see-active-shows").removeClass("active-tab");
  $("#see-upcoming-shows").addClass("active-tab");
  $("#edit-profile").removeClass("active-tab");
});

$("#open-shows").click(function () {
  var selected = [];
  $(".lottery-direct-checkbox").each(function (i, checkbox) {
    if (checkbox.checked) selected.push($(checkbox.parentNode.parentNode).find("a")[0].href);
  });

  $(".lucky-checkbox").each(function (i, checkbox) {
    if (checkbox.checked) selected.push($(checkbox.parentNode.parentNode).find("a")[0].href);
  });

  selected.forEach(function(show_url) {
    chrome.tabs.create({
      url: show_url,
      active: false
    });
  });
});
////////////////////////////////
// END BUTTON CLICK FUNCTIONS //
////////////////////////////////
