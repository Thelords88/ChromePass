import { detectFields, waitForPasswordField } from './CredentialFieldDetector.js';

async function fillFields(credential, usernameField, passwordField) {
     if (usernameField != null){
        usernameField.value = credential.username
        
        usernameField.dispatchEvent(new Event('input', {bubbles: true}));
     }
          if (passwordField != null){
            passwordField.value = credential.password

            passwordField.dispatchEvent(new Event('input', {bubbles: true}));
     }

     return
    }

async function autoFill(credential){
    const {usernameField, passwordField} = detectFields();

            if (usernameField && !passwordField){
            fillFields(credential, usernameField, null);
             waitForPasswordField((passwordField) => {
            passwordField.value = credential.password;
            passwordField.dispatchEvent(new Event('input', {bubbles: true}));

            });   
            
            }
            if (usernameField && passwordField){
            fillFields(credential, usernameField, passwordField);


            }
        }
// needed to make autofill avilable for other files
export {autoFill};