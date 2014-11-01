/* chrome extension: shopClipper */

// common
const STAR_IMAGE_WIDTH  = 22;

var popup = {};
popup.close = function(){
  setTimeout(function(){
    window.close();
  }, 1300);
}

var Status = function(){
  this.element = document.getElementById("status");
  this.setDefaultText = function(){
    this.element.innerHTML = "行きたい度を選択してください";
  }
  this.setText = function(text){
    this.element.innerHTML = (typeof(text) != "undefined" && text.length > 0) ? text : "";
  }
}

// methods
function http_request(type, url, query){
  var READYSTATE = {
    UNINITIALIZED : 0,
    LOADING       : 1,
    LOADED        : 2,
    INTERACTIVE   : 3,
    COMPLETE      : 4,
  }

  var HTTP_STATUS_CODE  = {
    SUCCESS: 200,
  }

  var xhr  = new XMLHttpRequest();
  var sync = true;

  xhr.onreadystatechange = function(){
    var status = new Status();
    switch(this.readyState){
      case READYSTATE.LOADING:
        status.setText("読み込み中...");
      break;

      case READYSTATE.COMPLETE:
        if(this.status == HTTP_STATUS_CODE.SUCCESS){
          var response = JSON.parse(this.responseText);
          if(response.success){
            status.setText("お店情報をクリップしました");
            popup.close();
          }
          else{
            status.setText(response.error.reason);
          }
        }
        else{
          status.setText("アクセス出来ませんでした"+" (status_code:" + this.status +")");
        }
      break;

      default:
      break;
    };
  }

  type = type.toUpperCase();
  switch(type){
    case "GET":
      xhr.open(type, build_query(url, query), sync);
      xhr.send();
    break;

    case "POST":
      xhr.open(type, url, sync);
      xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
      xhr.send(encodeURIComponent(query));
    break;

    default:
      // undefined method
    break;
  }
  return true;
}

function build_query(host, params){
  var query = "";
  for(var key in params) {
    query += encodeURIComponent(key) + "=" + encodeURIComponent(params[key]) + "&";
  }
  if (query.length > 0){
    query = "?" + query.substring(0, query.length-1);
  }
  return host+query;  
}

function save_to_clipboard(text){
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

function calc_rate_value(currentXpos){
  var rate = Math.round(currentXpos / STAR_IMAGE_WIDTH);
  if(rate > 5){
    rate = 5;
  }
  else if(rate < 1){
    rate = 1;
  }
  return rate;
}

function normalize_category(raw_category){
  var status = new Status();
  var category = raw_category;
  status.setDefaultText(); 

  if(category.length > 0){
    category = category.replace(/　/g, " ").trim();
    category = category.split(" ").filter(function(x, i, self){
      return self.indexOf(x) === i;
    });
    if(category.length > 5){
      status.setText("カテゴリの設定は5個までです");
      category = category.slice(0, 5);
    }
    category = category.join(" ");
  }
  else{
    category = "";
  }
  return category.trim();
}

document.addEventListener('DOMContentLoaded', function (){
  var google_app_script_url = "https://script.google.com/macros/s/AKfycbzCGe6OrEJEuvpefuNzNuofYtM3e3g4ndI8SHiXrSBzLxDQ8x8s/exec";

  chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
    var currentTab = tabs[0];

    // initialize rate
    document.getElementById("vote-wrapper").style.width = STAR_IMAGE_WIDTH + "px";

    // addEventListener
    document.getElementById("save-to-clipboard").addEventListener("click", function(){
      var status = new Status();
      status.setText("クリップボードにコピー中です...");
      save_to_clipboard(currentTab.title+" "+currentTab.url);
      status.setText("クリップボードにコピーしました");
      popup.close();
    }, false);

    document.getElementById("vote-container").addEventListener("mousemove", function(e){
      var vote_wrapper_element = document.getElementById("vote-wrapper");
      vote_wrapper_element.style.width = calc_rate_value(e.clientX) * STAR_IMAGE_WIDTH + "px";
    }, false);

    document.getElementById("input-categories").addEventListener("blur", function(e){
      this.value = normalize_category(this.value);
    });

    document.getElementById("input-categories").addEventListener("keypress", function(e){
      if(e.keyCode === 13){
        var rate             = Math.round(Number(document.getElementById("vote-wrapper").style.width.replace(/px/g, "")) / STAR_IMAGE_WIDTH);
        var category_element = document.getElementById("input-categories");
        category_element.value = normalize_category(category_element.value);
        http_request("GET", google_app_script_url, {rate: rate, title: currentTab.title, url: currentTab.url, category: category_element.value});
      }
    });

    document.getElementById("vote-container").addEventListener("click", function(e){
      var rate             = calc_rate_value(e.clientX);
      var category_element = document.getElementById("input-categories");
      category_element.value = normalize_category(category_element.value);
      http_request("GET", google_app_script_url, {rate: rate, title: currentTab.title, url: currentTab.url, category: category_element.value});
    }, false);
  });
});
