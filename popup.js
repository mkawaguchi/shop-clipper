/* chrome extension: shopClipper */

// global
const GOOGLE_APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzCGe6OrEJEuvpefuNzNuofYtM3e3g4ndI8SHiXrSBzLxDQ8x8s/exec";
const DEBUG_MODE            = 0;

var global = {};
var popup = {};
popup.close = function(){
  setTimeout(function(){
    window.close();
  }, 1300);
}

// class define
var Status = function(){
  this.element = document.getElementById("status");

  this.setDefaultText = function(){
    this.element.innerHTML = "行きたい度を選択してください";
  }
  this.setText = function(text){
    this.element.innerHTML = (typeof(text) != "undefined" && text.length > 0) ? text : "";
  }
}

var Rate = function(){
  const STAR_IMAGE_WIDTH = 22;
  const DEFAULT_RATE     = 1;
  this.element = document.getElementById("vote-wrapper");
  this.__construct = function(element){
    element.style.width = DEFAULT_RATE * STAR_IMAGE_WIDTH + "px";
  }(this.element);
  this.get = function(){
    return Math.round(Number(this.element.style.width.replace(/px/g, "")) / STAR_IMAGE_WIDTH);
  }
  this.set = function(currentXpos){
      this.element.style.width = this.calc(currentXpos) * STAR_IMAGE_WIDTH + "px";
  }
  this.calc = function(currentXpos){
    var rate = Math.round(currentXpos / STAR_IMAGE_WIDTH);
    if(rate > 5){
      rate = 5;
    }
    else if(rate < 1){
      rate = 1;
    }
    return rate;    
  }
}

var Category = function(){
    const CATEGORY_ITEM_MAX = 5;
    this.element = document.getElementById("input-categories");
    this.get = function(){
      return this.element.value;
    }
    this.set = function(category){
      this.element.value = category;
    }
    this.update = function(){
        var normalized_category = this.normalize(this.get());
        if(normalized_category.success === true){
          this.set(normalized_category.category);
          return true;
        }
        else{
          global.status.setText(normalized_category.error.message);
          this.set(normalized_category.category);
          return false;
        }
    }
    this.normalize = function(raw_category){
      var category = raw_category;
      if(category.length > 0){
        category = category.replace(/　/g, " ");
        category = category.replace(/ {2,}/g, " ").trim();
        category = category.split(" ").filter(function(x, i, self){
          return self.indexOf(x) === i;
        });
        if(category.length > CATEGORY_ITEM_MAX){
          category = category.slice(0, CATEGORY_ITEM_MAX);
          category = category.join(" ");
          category = category.trim();
          return {success: false, category: category, error: {message: "カテゴリの設定は"+CATEGORY_ITEM_MAX+"個までです"}};
        }
        category = category.join(" ");
        category = category.trim();
      }
      return {success: true, category: category};
    }
}

var Http = function(){
  const READYSTATE = {
    UNINITIALIZED : 0,
    LOADING       : 1,
    LOADED        : 2,
    INTERACTIVE   : 3,
    COMPLETE      : 4,
  }
  const HTTP_STATUS_CODE  = {
    SUCCESS: 200,
  }
  var xhr  = new XMLHttpRequest();
  var sync;

  this.request = function(type, url, query, option){
    sync = (typeof(option.sync) != "undefined" && option.sync == false) ? false : true; 
    xhr.onreadystatechange = this.readyStateChange;
    this.requestSelector(type, url, query);
    return true;
  }
  this.requestSelector = function(type, url, query){
    type = type.toUpperCase();
    switch(type){
      case "GET":
        xhr.open(type, this.buildQuery(url, query), sync);
        xhr.send();
      break;

      case "POST":
        xhr.open(type, url, sync);
        xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
        xhr.send(encodeURIComponent(query));
      break;

      default:
      break;
    }
  }
  this.readyStateChange = function(){
    var readyState = this.readyState;
    var statusCode = this.status;
    switch(readyState){
      case READYSTATE.LOADING:
        global.status.setText("読み込み中...");
      break;

      case READYSTATE.COMPLETE:
        if(statusCode == HTTP_STATUS_CODE.SUCCESS){
          var response = JSON.parse(this.responseText);
          if(response.success){
            global.status.setText("お店情報をクリップしました");
            popup.close();
          }
          else{
            global.status.setText(response.error.reason);
          }
        }
        else{
          global.status.setText("アクセス出来ませんでした"+" (status_code:" + statusCode +")");
        }
      break;

      default:
      break;
    };
  }
  this.buildQuery = function(host, params){
    var query = "";
    for(var key in params) {
      query += encodeURIComponent(key) + "=" + encodeURIComponent(params[key]) + "&";
    }
    if (query.length > 0){
      query = "?" + query.substring(0, query.length-1);
    }
    return host+query;
  }
}

var Clipboard = function(){
  this.export = function(text){
    var textarea = document.createElement("textarea");
    textarea.setAttribute("display", "none");
    textarea.setAttribute("height", "0");
    textarea.setAttribute("width", "0");
    document.body.appendChild(textarea);
    textarea.value = text;
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    return true;
  }
}

function addEventListeners(){
  document.getElementById("save-to-clipboard").addEventListener("click", global.callbackMethods.saveToClipboard, false);
  document.getElementById("vote-container").addEventListener("mousemove", global.callbackMethods.voteContainer.mousemove, false);
  document.getElementById("vote-wrapper").addEventListener("click", global.callbackMethods.voteWrapper.click, false);
  document.getElementById("input-categories").addEventListener("blur", global.callbackMethods.inputCategories.blur, false);
  document.getElementById("input-categories").addEventListener("keypress", global.callbackMethods.inputCategories.keypress, false);
  return true;
}

function removeEventListeners(){
  document.getElementById("vote-container").removeEventListener("mousemove", global.callbackMethods.voteContainer.mousemove, false);
  document.getElementById("vote-wrapper").removeEventListener("click", global.callbackMethods.voteWrapper.click, false);
  document.getElementById("input-categories").removeEventListener("blur", global.callbackMethods.inputCategories.blur, false);
  document.getElementById("input-categories").removeEventListener("keypress", global.callbackMethods.inputCategories.keypress, false);
  document.getElementById("input-categories").readOnly = true;
  return true;
}

document.addEventListener('DOMContentLoaded', function (){
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
    var currentTab = tabs[0];

    // setup
    global.status = new Status();
    var rate      = new Rate();
    var category  = new Category();
    var http      = new Http();
    var clipboard = new Clipboard();

    global.callbackMethods = {
      voteContainer: {
        mousemove: function(e){
          rate.set(e.clientX);
        }
      },
      voteWrapper: {
        click: function(e){
          removeEventListeners();
          http.request("GET", GOOGLE_APP_SCRIPT_URL, {rate: rate.get(), title: currentTab.title, url: currentTab.url, category: category.get(), debug: DEBUG_MODE}, {});
        }
      },
      inputCategories: {
        blur: function(e){
            global.status.setDefaultText();
            category.update();
        },
        keypress: function(e){
          if(e.keyCode === 13){
            if(category.update()){
              removeEventListeners();
              http.request("GET", GOOGLE_APP_SCRIPT_URL, {rate: rate.get(), title: currentTab.title, url: currentTab.url, category: category.get(), debug: DEBUG_MODE}, {});
            }
          }
        }
      },
      saveToClipboard: function(){
        removeEventListeners();
        global.status.setText("クリップボードにコピー中です...");
        clipboard.export(currentTab.title+" "+currentTab.url);
        global.status.setText("クリップボードにコピーしました");
        popup.close();
      }
    };

    addEventListeners();
  });
});
