fn main() -> Result<(), Box<dyn std::error::Error>> {
    std::env::set_var("PROTOC", protoc_bin_vendored::protoc_bin_path()?);
    tonic_build::configure()
        .build_server(true)
        .build_client(false)
        .compile(
            &[
                "../proto/test/test.proto",
                "../proto/metrics/metrics.proto",
            ],
            &["../proto"],
        )?;
    Ok(())
}




