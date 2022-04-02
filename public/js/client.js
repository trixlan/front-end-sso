
function logout() {
    $.removeCookie('logged_in');
    $.removeCookie('full_name');
    location.reload();
}

function setNewPageSize(value) {
    location.search = $.query.set("page", 1).set("size", value);
}

function setNewPage(value) {
    location.search = $.query.set("page", value);
}

function setNewTags(value) {
    location.search = $.query.set("tags", value);
}

function resetTags() {
    location.search = $.query.remove("tags");
}

function order() {
    if (!$.cookie('logged_in')) {
        $("#user-message").html('<div class="alert alert-danger alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button> You must be logged in to place an order.</div>');
        return false;
    }

    var success = false;
    $.ajax({
        url: "orders",
        type: "POST",
        async: false,
        success: function (data, textStatus, jqXHR) {
            if (jqXHR.status == 201) {
                console.log("Order placed.");
                $("#user-message").html('<div class="alert alert-success alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button> Order placed.</div>');
                deleteCart();
                success = true;
            }
        },
        error: function (jqXHR, textStatus, errorThrown) {
            response_payload = JSON.parse(jqXHR.responseText)
            console.log('error: ' + jqXHR.responseText);
            if (jqXHR.status == 406) {
                $("#user-message").html('<div class="alert alert-danger alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button> Error placing order. ' + response_payload.message + '</div>');
            }
        }
    });
    return success;
}

function deleteCart() {
    $.ajax({
        url: "cart",
        type: "DELETE",
        async: true,
        success: function (data, textStatus, jqXHR) {
            console.log("Cart deleted.");
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.log('error: ' + JSON.stringify(jqXHR));
            console.log('error: ' + textStatus);
            console.log('error: ' + errorThrown);
        }
    });
}

function addToCart(id) {
    console.log("Sending request to add to cart: " + id);
    $.ajax({
        url: "cart",
        type: "POST",
        data: JSON.stringify({"id": id}),
        success: function (data, textStatus, jqXHR) {
            console.log('Item added: ' + id + ', ' + textStatus);
            location.reload();
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.error('Could not add item: ' + id + ', due to: ' + textStatus + ' | ' + errorThrown);
        }
    });
}

// function update To Cart(itemId, quantity, callback)
// cart/update request sent to frontend server (index.js - app.post("/cart/update" function...)
function updateToCart(id, quantity, next) {

	console.log("Sending request to update cart: item: " + id + " quantity: " + quantity);
    $.ajax({
        url: "cart/update",
        type: "POST",
        data: JSON.stringify({"id": id, "quantity": quantity}),
        success: function (data, textStatus, jqXHR) {
            console.log('Item updated: ' + id + ', ' + textStatus);
            next();
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.error('Could not update item: ' + id + ', due to: ' + textStatus + ' | ' + errorThrown);
            next();
        }
    });
}

function address() {
    var data = {
        "number": $("#form-number").val(),
        "street": $("#form-street").val(),
        "city": $("#form-city").val(),
        "postcode": $("#form-post-code").val(),
        "country": $("#form-country").val()
    };
    $.ajax({
        url: "addresses",
        type: "POST",
        async: false,
        data: JSON.stringify(data),
        success: function (data, textStatus, jqXHR) {
            location.reload();
        },
        error: function (jqXHR, textStatus, errorThrown) {
            $("#user-message").html('<div class="alert alert-danger alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button> Error saving the address. ' + errorThrown + '</div>');
            console.log('error: ' + JSON.stringify(jqXHR));
            console.log('error: ' + textStatus);
            console.log('error: ' + errorThrown);
        },
    });
    return false;
}

function card() {
    var data = {
        "longNum": $("#form-card-number").val(),
        "expires": $("#form-expires").val(),
        "ccv": $("#form-ccv").val()
    };
    $.ajax({
        url: "cards",
        type: "POST",
        async: false,
        data: JSON.stringify(data),
        success: function (data, textStatus, jqXHR) {
            location.reload();
        },
        error: function (jqXHR, textStatus, errorThrown) {
            $("#user-message").html('<div class="alert alert-danger alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button> Error saving the creditcard. ' + errorThrown + '</div>');
            console.log('error: ' + JSON.stringify(jqXHR));
            console.log('error: ' + textStatus);
            console.log('error: ' + errorThrown);
        },
    });
    return false;
}
