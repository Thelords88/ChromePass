function findPasswordField(){
    const multipleFields = document.querySelectorAll('input[type="password"]')
    const singleField = document.querySelector('input[type="password"]');
    // Prevent Autofill from giving more than 1 password at a time
    if (multipleFields.length>1){
        return null
    }
    else{
        return singleField
    }

}

function findUsernameField(){
    return document.querySelector('input[autocomplete*="user"]') ||
    document.querySelector('input[autocomplete*="email"]') ||
    document.querySelector('input[type="email"]') ||
    document.querySelector('input[id="username"]');
}

function detectFields(){
    const  usernameField = findUsernameField();
    const passwordField = findPasswordField();

    return { usernameField, passwordField  };
}

function waitForPasswordField(callback, timeout = 10000){
    if (findPasswordField()){
        callback(findPasswordField());
        return
    }

    const observer = new MutationObserver(() => {
        const field = findPasswordField();
        if (field){
            observer.disconnect();
            callback(field);
        }
    });
    observer.observe(document.body, {childList: true, subtree: true})
    setTimeout(() => observer.disconnect(), timeout);
    
}

export { detectFields, waitForPasswordField };