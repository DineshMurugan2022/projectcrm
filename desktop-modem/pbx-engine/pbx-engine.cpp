// Copyright (C) 2026 BNY CRM. Licensed under GPL-2.0-or-later; see LICENSE.txt.
#define PJ_AUTOCONF 1
#include <pjsua-lib/pjsua.h>

#include <algorithm>
#include <cctype>
#include <iostream>
#include <map>
#include <mutex>
#include <string>

namespace {
std::mutex output_mutex;
pjsua_acc_id account_id = PJSUA_INVALID_ID;
pjsua_call_id active_call = PJSUA_INVALID_ID;
std::string sip_domain;

// IMPORTANT: pj_str() stores a raw pointer, NOT a copy of the string.
// Strings passed to pjsua config structs must outlive the library instance.
// We declare these globals so they persist beyond configure_account().
static std::string g_id_uri;
static std::string g_registrar_uri;
static std::string g_login;
static std::string g_password_store;
static std::string g_stun_server;
static std::string g_dial_destination; // per-dial, must stay alive until call ends

std::string json_escape(const std::string& value) {
    std::string out;
    for (unsigned char c : value) {
        switch (c) {
        case '"': out += "\\\""; break;
        case '\\': out += "\\\\"; break;
        case '\n': out += "\\n"; break;
        case '\r': out += "\\r"; break;
        case '\t': out += "\\t"; break;
        default: if (c >= 0x20) out += static_cast<char>(c); break;
        }
    }
    return out;
}

void emit(const std::string& json) {
    std::lock_guard<std::mutex> lock(output_mutex);
    std::cout << json << std::endl;
}

std::map<std::string, std::string> parse_json_object(const std::string& line) {
    std::map<std::string, std::string> result;
    size_t i = 0;
    auto skip_space = [&]() { while (i < line.size() && std::isspace(static_cast<unsigned char>(line[i]))) ++i; };
    auto read_string = [&]() -> std::string {
        std::string value;
        if (i >= line.size() || line[i++] != '"') return value;
        while (i < line.size()) {
            char c = line[i++];
            if (c == '"') break;
            if (c == '\\' && i < line.size()) {
                char e = line[i++];
                switch (e) {
                case '"': value += '"'; break;
                case '\\': value += '\\'; break;
                case '/': value += '/'; break;
                case 'n': value += '\n'; break;
                case 'r': value += '\r'; break;
                case 't': value += '\t'; break;
                default: value += e; break;
                }
            } else value += c;
        }
        return value;
    };
    skip_space();
    if (i >= line.size() || line[i++] != '{') return result;
    while (i < line.size()) {
        skip_space();
        if (i < line.size() && line[i] == '}') break;
        std::string key = read_string();
        skip_space();
        if (i >= line.size() || line[i++] != ':') break;
        skip_space();
        std::string value = read_string();
        result[key] = value;
        skip_space();
        if (i < line.size() && line[i] == ',') { ++i; continue; }
        break;
    }
    return result;
}

std::string pj_to_string(const pj_str_t& value) {
    return value.ptr && value.slen > 0 ? std::string(value.ptr, static_cast<size_t>(value.slen)) : std::string();
}

std::string normalize_host(std::string value) {
    auto trim = [](std::string& s) {
        while (!s.empty() && std::isspace(static_cast<unsigned char>(s.front()))) s.erase(s.begin());
        while (!s.empty() && std::isspace(static_cast<unsigned char>(s.back()))) s.pop_back();
    };
    trim(value);
    if (value.rfind("sip:", 0) == 0) value.erase(0, 4);
    if (value.rfind("sips:", 0) == 0) value.erase(0, 5);
    const size_t semicolon = value.find(';');
    if (semicolon != std::string::npos) value.resize(semicolon);
    return value;
}

std::string uri_user(const std::string& uri) {
    size_t begin = uri.find("sip:");
    if (begin == std::string::npos) begin = 0; else begin += 4;
    const size_t end = uri.find('@', begin);
    if (end == std::string::npos) return uri;
    std::string user = uri.substr(begin, end - begin);
    const size_t colon = user.find(':');
    if (colon != std::string::npos) user.resize(colon);
    return user;
}

void emit_registration(bool registered, int code, const std::string& reason) {
    emit("{\"type\":\"registration\",\"registered\":" + std::string(registered ? "true" : "false") +
         ",\"code\":" + std::to_string(code) + ",\"message\":\"" + json_escape(reason) + "\"}");
}

void on_reg_state2(pjsua_acc_id, pjsua_reg_info* info) {
    if (!info || !info->cbparam) return;
    const int code = info->cbparam->code;
    const bool registered = code >= 200 && code < 300 && !info->cbparam->is_unreg;
    emit_registration(registered, code, pj_to_string(info->cbparam->reason));
}

void emit_call_state(pjsua_call_id call_id) {
    pjsua_call_info info;
    if (pjsua_call_get_info(call_id, &info) != PJ_SUCCESS) return;
    const std::string state = pj_to_string(info.state_text);
    const std::string number = uri_user(pj_to_string(info.remote_info));
    emit("{\"type\":\"call\",\"callId\":" + std::to_string(call_id) +
         ",\"state\":\"" + json_escape(state) + "\",\"number\":\"" + json_escape(number) +
         "\",\"lastStatus\":" + std::to_string(info.last_status) +
         ",\"reason\":\"" + json_escape(pj_to_string(info.last_status_text)) + "\"}");
}

void on_call_state(pjsua_call_id call_id, pjsip_event*) {
    emit_call_state(call_id);
    pjsua_call_info info;
    if (pjsua_call_get_info(call_id, &info) == PJ_SUCCESS) {
        if (info.state == PJSIP_INV_STATE_DISCONNECTED) {
            if (active_call == call_id) active_call = PJSUA_INVALID_ID;
        }
    } else {
        if (active_call == call_id) active_call = PJSUA_INVALID_ID;
    }
}

void on_call_media_state(pjsua_call_id call_id) {
    pjsua_call_info info;
    if (pjsua_call_get_info(call_id, &info) != PJ_SUCCESS) return;
    bool audio_connected = false;
    // Iterate all media streams (handles multi-stream / bundle SDP)
    for (unsigned i = 0; i < info.media_cnt; ++i) {
        if (info.media[i].type == PJMEDIA_TYPE_AUDIO &&
            info.media[i].status == PJSUA_CALL_MEDIA_ACTIVE) {
            pjsua_conf_port_id slot = info.media[i].stream.aud.conf_slot;
            if (slot != PJSUA_INVALID_ID) {
                pjsua_conf_connect(slot, 0);
                pjsua_conf_connect(0, slot);
                audio_connected = true;
            }
        }
    }
    // Fallback: use legacy conf_slot for older PJSUA builds
    if (!audio_connected && info.conf_slot != PJSUA_INVALID_ID &&
        info.media_status == PJSUA_CALL_MEDIA_ACTIVE) {
        pjsua_conf_connect(info.conf_slot, 0);
        pjsua_conf_connect(0, info.conf_slot);
        audio_connected = true;
    }
    if (audio_connected) {
        emit("{\"type\":\"audio\",\"active\":true}");
    }
}

void on_incoming_call(pjsua_acc_id, pjsua_call_id call_id, pjsip_rx_data*) {
    // If active_call is set, check if it is truly in an active non-disconnected state
    if (active_call != PJSUA_INVALID_ID) {
        pjsua_call_info existing_info;
        if (pjsua_call_get_info(active_call, &existing_info) == PJ_SUCCESS &&
            existing_info.state != PJSIP_INV_STATE_DISCONNECTED &&
            existing_info.state != PJSIP_INV_STATE_NULL) {
            pjsua_call_answer(call_id, PJSIP_SC_BUSY_HERE, nullptr, nullptr);
            return;
        }
        active_call = PJSUA_INVALID_ID;
    }
    active_call = call_id;

    // Immediately send 180 Ringing to PBX so server knows client is ringing and does not drop/cancel
    pjsua_call_answer(call_id, PJSIP_SC_RINGING, nullptr, nullptr);

    pjsua_call_info info;
    std::string number;
    if (pjsua_call_get_info(call_id, &info) == PJ_SUCCESS) number = uri_user(pj_to_string(info.remote_info));
    emit("{\"type\":\"incoming\",\"callId\":" + std::to_string(call_id) +
         ",\"number\":\"" + json_escape(number) + "\"}");
    emit_call_state(call_id);
}

void emit_error(const std::string& message) {
    emit("{\"type\":\"error\",\"message\":\"" + json_escape(message) + "\"}");
}

bool configure_account(const std::map<std::string, std::string>& cfg) {
    const std::string server = normalize_host(cfg.count("server") ? cfg.at("server") : "");
    const std::string domain = normalize_host(cfg.count("domain") ? cfg.at("domain") : "");
    const std::string username = cfg.count("username") ? cfg.at("username") : "";
    const std::string login = cfg.count("login") ? cfg.at("login") : username;
    std::string password = cfg.count("password") ? cfg.at("password") : "";
    if (server.empty() || username.empty() || login.empty() || password.empty()) {
        emit_error("Enter the SIP server, username/login, and password.");
        return false;
    }
    if (username.find_first_of("\r\n\t") != std::string::npos || login.find_first_of("\r\n\t") != std::string::npos || password.find_first_of("\r\n") != std::string::npos) {
        emit_error("SIP values contain an unsupported line break.");
        return false;
    }
    sip_domain = domain.empty() ? server : domain;
    if (sip_domain.empty()) {
        emit_error("Enter a SIP domain.");
        return false;
    }

    // Populate globals that pj_str() will point into (must outlive pjsua)
    g_id_uri = "sip:" + username + "@" + sip_domain;
    g_registrar_uri = "sip:" + server;
    g_login = login;
    g_password_store = password;
    std::fill(password.begin(), password.end(), '\0');

    // STUN host: strip port from server so stun: URI is valid
    std::string server_host = server;
    const size_t colon_pos = server_host.find(':');
    if (colon_pos != std::string::npos) server_host.resize(colon_pos);
    g_stun_server = "stun:" + server_host;

    pjsua_config ua_cfg;
    pjsua_config_default(&ua_cfg);
    ua_cfg.cb.on_reg_state2 = &on_reg_state2;
    ua_cfg.cb.on_incoming_call = &on_incoming_call;
    ua_cfg.cb.on_call_state = &on_call_state;
    ua_cfg.cb.on_call_media_state = &on_call_media_state;
    ua_cfg.thread_cnt = 4;
    ua_cfg.max_calls = 4;
    // STUN for outgoing NAT traversal
    ua_cfg.stun_srv_cnt = 1;
    ua_cfg.stun_srv[0] = pj_str(const_cast<char*>(g_stun_server.c_str()));

    pjsua_logging_config log_cfg;
    pjsua_logging_config_default(&log_cfg);
    log_cfg.level = 3;
    log_cfg.console_level = 0;

    pjsua_media_config media_cfg;
    pjsua_media_config_default(&media_cfg);
    media_cfg.clock_rate = 8000;
    media_cfg.snd_clock_rate = 8000;
    media_cfg.channel_count = 1;
    media_cfg.ec_tail_len = 200;    // 200ms echo cancellation tail
    media_cfg.no_vad = PJ_TRUE;     // disable VAD: audio flows even during silence
    media_cfg.jb_init = 100;        // jitter buffer initial size ms
    media_cfg.jb_max_pre = 500;     // max jitter buffer ms
    media_cfg.enable_ice = PJ_TRUE; // ICE for media NAT traversal

    pj_status_t status = pjsua_create();
    if (status == PJ_SUCCESS) {
        status = pjsua_init(&ua_cfg, &log_cfg, &media_cfg);
        if (status != PJ_SUCCESS) {
            emit_error("SIP engine initialization failed (code " + std::to_string(status) + ").");
            pjsua_destroy();
            return false;
        }
    }
    if (status != PJ_SUCCESS) {
        emit_error("SIP engine initialization failed (code " + std::to_string(status) + ").");
        return false;
    }

    pjsua_transport_config transport_cfg;
    pjsua_transport_config_default(&transport_cfg);
    transport_cfg.port = 0;
    status = pjsua_transport_create(PJSIP_TRANSPORT_UDP, &transport_cfg, nullptr);
    if (status != PJ_SUCCESS) {
        emit_error("Could not open a local UDP SIP port (code " + std::to_string(status) + ").");
        pjsua_destroy();
        return false;
    }

    pjsua_acc_config acc_cfg;
    pjsua_acc_config_default(&acc_cfg);
    // CRITICAL: pj_str() stores a POINTER, not a copy.
    // These must point to global strings that outlive pjsua.
    acc_cfg.id = pj_str(const_cast<char*>(g_id_uri.c_str()));
    acc_cfg.reg_uri = pj_str(const_cast<char*>(g_registrar_uri.c_str()));
    acc_cfg.reg_timeout = 300;
    acc_cfg.ka_interval = 15;  // NAT keepalive every 15s
    acc_cfg.cred_count = 1;
    acc_cfg.cred_info[0].realm = pj_str(const_cast<char*>("*"));
    acc_cfg.cred_info[0].scheme = pj_str(const_cast<char*>("Digest"));
    acc_cfg.cred_info[0].username = pj_str(const_cast<char*>(g_login.c_str()));
    acc_cfg.cred_info[0].data_type = PJSIP_CRED_DATA_PLAIN_PASSWD;
    acc_cfg.cred_info[0].data = pj_str(const_cast<char*>(g_password_store.c_str()));
    acc_cfg.allow_contact_rewrite = PJ_TRUE;
    acc_cfg.contact_rewrite_method = 2; // always update Contact on re-registration
    // Enable ICE per-account for media NAT traversal on outgoing calls
    acc_cfg.ice_cfg_use = PJSUA_ICE_CONFIG_USE_CUSTOM;
    acc_cfg.ice_cfg.enable_ice = PJ_TRUE;

    status = pjsua_acc_add(&acc_cfg, PJ_TRUE, &account_id);
    // Zero and clear password global after pjsua has copied it internally
    std::fill(g_password_store.begin(), g_password_store.end(), '\0');
    g_password_store.clear();

    if (status != PJ_SUCCESS) {
        emit_error("Could not create the SIP account (code " + std::to_string(status) + ").");
        pjsua_destroy();
        return false;
    }

    status = pjsua_start();
    if (status != PJ_SUCCESS) {
        emit_error("SIP engine could not start (code " + std::to_string(status) + ").");
        pjsua_destroy();
        return false;
    }
    pj_str_t pcma = pj_str(const_cast<char*>("PCMA/8000/1"));
    pj_str_t pcmu = pj_str(const_cast<char*>("PCMU/8000/1"));
    pjsua_codec_set_priority(&pcma, 255);
    pjsua_codec_set_priority(&pcmu, 254);
    emit("{\"type\":\"ready\",\"transport\":\"UDP\",\"server\":\"" + json_escape(server) + "\"}");
    return true;
}

void handle_command(const std::map<std::string, std::string>& command) {
    const auto action_it = command.find("action");
    if (action_it == command.end()) return;
    const std::string& action = action_it->second;
    if (action == "dial") {
        auto number_it = command.find("number");
        if (number_it == command.end()) { emit_error("Enter a phone number."); return; }
        std::string number = number_it->second;
        number.erase(std::remove_if(number.begin(), number.end(), [](unsigned char c) { return std::isspace(c); }), number.end());
        if (number.empty() || number.size() > 48 || number.find_first_not_of("+0123456789*#") != std::string::npos) {
            emit_error("Enter a phone number using digits, +, * or #."); return;
        }
        if (active_call != PJSUA_INVALID_ID) { emit_error("A call is already active."); return; }
        if (account_id == PJSUA_INVALID_ID) { emit_error("SIP account not configured."); return; }
        // Keep destination URI in global storage: pjsua may reference this pointer
        // during the INVITE/early-media/CONFIRMED states until the call ends.
        g_dial_destination = "sip:" + number + "@" + sip_domain;
        pj_str_t uri = pj_str(const_cast<char*>(g_dial_destination.c_str()));
        pjsua_call_setting setting;
        pjsua_call_setting_default(&setting);
        setting.aud_cnt = 1;
        setting.vid_cnt = 0;
        pjsua_call_id call_id = PJSUA_INVALID_ID;
        pj_status_t status = pjsua_call_make_call(account_id, &uri, &setting, nullptr, nullptr, &call_id);
        if (status != PJ_SUCCESS) { emit_error("Call could not be started (code " + std::to_string(status) + ")."); return; }
        active_call = call_id;
        emit("{\"type\":\"outgoing\",\"callId\":" + std::to_string(call_id) + ",\"number\":\"" + json_escape(number) + "\"}");
    } else if (action == "answer") {
        if (active_call == PJSUA_INVALID_ID) { emit_error("There is no incoming call to answer."); return; }
        // Guard: only answer when call is in INCOMING or EARLY state
        pjsua_call_info info;
        if (pjsua_call_get_info(active_call, &info) == PJ_SUCCESS &&
            info.state != PJSIP_INV_STATE_INCOMING && info.state != PJSIP_INV_STATE_EARLY) {
            emit_error("Call is not in a state that can be answered."); return;
        }
        pj_status_t status = pjsua_call_answer(active_call, PJSIP_SC_OK, nullptr, nullptr);
        if (status != PJ_SUCCESS) emit_error("Call could not be answered (code " + std::to_string(status) + ").");
    } else if (action == "reject") {
        if (active_call == PJSUA_INVALID_ID) { emit_error("There is no incoming call to reject."); return; }
        pjsua_call_answer(active_call, PJSIP_SC_DECLINE, nullptr, nullptr);
        active_call = PJSUA_INVALID_ID; // clear immediately so next call can arrive
    } else if (action == "hangup") {
        if (active_call == PJSUA_INVALID_ID) return;
        pjsua_call_hangup(active_call, 0, nullptr, nullptr);
    } else if (action == "shutdown") {
        emit("{\"type\":\"shutdown\"}");
        pjsua_destroy();
    }
}
} // namespace

int main() {
    std::string line;
    if (!std::getline(std::cin, line)) return 2;
    auto config = parse_json_object(line);
    const bool configured = configure_account(config);
    std::fill(line.begin(), line.end(), '\0');
    for (auto& item : config) std::fill(item.second.begin(), item.second.end(), '\0');
    if (!configured) return 3;
    while (std::getline(std::cin, line)) {
        auto command = parse_json_object(line);
        if (command["action"] == "shutdown") {
            handle_command(command);
            break;
        }
        handle_command(command);
    }
    return 0;
}