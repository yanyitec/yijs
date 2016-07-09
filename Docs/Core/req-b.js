yi.log("req-b.js loaded.");
yi.log("define(deps=[req-a])");
$define(["req-a.js"],function(a){
	yi.log("req-b.js return value");
	this.resolve("instance[b.js]");
});