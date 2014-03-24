(function() {
	window.addEventListener("load", function() {

		var scoreClasses = [
			"perfect",
			"great",
			"good",
			"average",
			"poor",
			"worse",
			"abysmal",
			"nonexistent"
		].reverse();

		var key = document.createElement("div");

		scoreClasses.concat(["unevaluated"]).forEach(function(className) {
			var keyItem = document.createElement("span");
				keyItem.classList.add("key-item");
				keyItem.classList.add(className);

			keyItem.appendChild(document.createTextNode(
				className[0].toUpperCase() +
				className.substr(1)
			));

			key.appendChild(keyItem);
		});

		document.querySelector("#guide")
			.appendChild(key);

		[].slice.call(document.querySelectorAll(".evaluated"))
			.forEach(function(item) {
				var score = (item.dataset.score) * (scoreClasses.length-1) | 0,
					scoreClass = scoreClasses[score];

				item.classList.add(scoreClass);

				item.title = (
					scoreClass[0].toUpperCase() +
					scoreClass.substr(1) +
					" code coverage.\n" +
					"[" + item.dataset.type + "]\n" +
					"Depth: " + item.dataset.depth + "\n" +
					"Score: " + item.dataset.score
				);
			});

		[].slice.call(document.querySelectorAll(".unevaluated"))
			.forEach(function(item) {
				item.title = "WARNING: This code was never evaluated.";
			});

	}, false);
})();