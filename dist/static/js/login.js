var fOnLoad;fOnLoad=function(){return document.title="Login",$("#pagetitle").text("Login!"),window.CryptoJS||$("#info").text("CryptoJS library missing! Are you connected to the internet?"),$("#but_submit").click(function(){var t,n;return n=CryptoJS.SHA3($("#password").val(),{outputLength:512}),t={username:$("#username").val(),password:n.toString()},$.post("/session/login",t).done(function(t){return window.location.href=document.URL}).fail(function(t){return alert("Authentication not successful!")})})},window.addEventListener("load",fOnLoad,!0);