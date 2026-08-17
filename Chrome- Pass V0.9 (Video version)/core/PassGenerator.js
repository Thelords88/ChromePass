


 function passwordGeneration(options){

  // SIZE/PASSWORD LENGTH has to be VALIDATED outside the function!!
  if(options.size > 64 || options.size <8){
    throw new Error("Password Size invalid")
  }
  
  const SETS = {
      lower: "abcdefghijklmnopqrstuvwxyz",
      upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      digits: "0123456789",
      symbols: "!@#$%^&*()-_=+[]{};:,.<>/?",
    };
    let pool = SETS.lower;
    if (options.upper == true){
      pool+= SETS.upper
    }
    if (options.digits == true){
      pool+= SETS.digits

    }
    if (options.symbols == true){
      pool+= SETS.symbols

    }

    /* Added modulo, which introduces a bias
      to reduce that bias, a counter >= 3,4,5,6
      if triggered, will activate module 
      otherwise a random 8 bit number will be re-picked
      securely using crypto
    */
    let pass ="";
    let counter = 0;
    while(true){
      let number= crypto.getRandomValues(new Uint8Array(1))[0];
        if (number > pool.length-1){
        number= crypto.getRandomValues(new Uint8Array(1))[0];
        counter+=1
        }
        else{
          pass+= pool[number]
          counter = 0
        }
        // random less secure counter will activate between 3-6
        if(counter >= Math.floor(Math.random()*(6-3))+3 ){
          pass+= pool [number%pool.length]
          counter =0
        }
        if (options.size == pass.length){
          break
        }

      }
      return pass
  }

  export { passwordGeneration };